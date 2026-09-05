import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  CloudinaryImageMetadata,
  CloudinaryService,
} from '../common/cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { userId: string; role: UserRole };

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService,
  ) {}

  async createProductUploadSignature(brandId: string, actor: Actor) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });
    if (!brand)
      throw new NotFoundException(`Brand with ID ${brandId} not found`);
    if (actor.role !== UserRole.ADMIN && brand.ownerId !== actor.userId) {
      throw new ForbiddenException(
        'You can only upload images for your own brand',
      );
    }

    const folder = `gadmar/brands/${brandId}/products`;
    const fileName = randomUUID();
    const publicId = `${folder}/${fileName}`;
    const backendUrl = this.config
      .getOrThrow<string>('BACKEND_URL')
      .replace(/\/+$/, '');
    const notificationUrl = `${backendUrl}/api/v1/media/cloudinary/webhook`;
    await this.prisma.mediaUpload.create({
      data: {
        publicId,
        brandId,
        requestedBy: actor.userId,
        claimedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return {
      ...this.cloudinary.createUploadSignature(publicId, notificationUrl),
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
      maxBytes: 10 * 1024 * 1024,
      maxProductImages: 8,
    };
  }

  async verifyProductUploads(
    publicIds: string[],
    brandId: string,
    actor: Actor,
  ): Promise<CloudinaryImageMetadata[]> {
    const verified: CloudinaryImageMetadata[] = [];
    for (const publicId of publicIds) {
      const upload = await this.prisma.mediaUpload.findFirst({
        where: {
          publicId,
          brandId,
          requestedBy: actor.userId,
          ...this.unusedUploadWhere(),
          expiresAt: { gt: new Date() },
        },
      });
      if (!upload) {
        await this.throwUploadAuthorizationError(publicId, brandId, actor);
        continue;
      }

      let metadata = this.metadataFromUpload(upload);
      if (!metadata) {
        metadata = await this.cloudinary.getImageMetadata(publicId);
        this.validateImageMetadata(metadata, publicId, brandId);
        await this.prisma.mediaUpload.update({
          where: { id: upload.id },
          data: { ...metadata, verifiedAt: new Date() },
        });
      }
      verified.push(metadata);
    }
    return verified;
  }

  async claimProductUploads(
    publicIds: string[],
    brandId: string,
    actor: Actor,
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    for (const publicId of publicIds) {
      const claimed = await transaction.mediaUpload.updateMany({
        where: {
          publicId,
          brandId,
          requestedBy: actor.userId,
          ...this.unusedUploadWhere(),
          expiresAt: { gt: new Date() },
        },
        data: { claimedAt: new Date() },
      });
      if (claimed.count !== 1) {
        await this.throwUploadAuthorizationError(publicId, brandId, actor);
      }
    }
  }

  async cleanupExpiredUploads(): Promise<number> {
    const uploads = await this.prisma.mediaUpload.findMany({
      where: { ...this.unusedUploadWhere(), expiresAt: { lte: new Date() } },
      take: 100,
      orderBy: { expiresAt: 'asc' },
    });
    let removed = 0;
    for (const upload of uploads) {
      try {
        await this.cloudinary.deleteImage(upload.publicId);
        await this.prisma.mediaUpload.delete({ where: { id: upload.id } });
        removed += 1;
      } catch (error) {
        this.logger.error(
          `Could not clean abandoned upload ${upload.publicId}; it will be retried`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return removed;
  }

  async handleCloudinaryWebhook(
    rawBody: string,
    body: Record<string, unknown>,
    signature?: string,
    timestampHeader?: string,
  ): Promise<void> {
    const timestamp = Number(timestampHeader);
    if (
      !rawBody ||
      !signature ||
      !timestampHeader ||
      !this.cloudinary.verifyNotificationSignature(
        rawBody,
        timestamp,
        signature,
      )
    ) {
      throw new UnauthorizedException('Invalid Cloudinary webhook signature');
    }
    if (body.resource_type !== 'image' || body.type !== 'upload') return;

    const metadata = this.cloudinary.normalizeImageMetadata(body);
    const upload = await this.prisma.mediaUpload.findUnique({
      where: { publicId: metadata.publicId },
    });
    if (!upload) return;

    this.validateImageMetadata(metadata, upload.publicId, upload.brandId);
    await this.prisma.mediaUpload.update({
      where: { id: upload.id },
      data: { ...metadata, verifiedAt: upload.verifiedAt || new Date() },
    });
  }

  async deleteOrQueue(
    publicId: string,
    brandId: string,
    requestedBy: string,
  ): Promise<void> {
    try {
      await this.cloudinary.deleteImage(publicId);
      await this.prisma.mediaUpload.deleteMany({ where: { publicId } });
    } catch (error) {
      this.logger.error(
        `Could not delete ${publicId}; queued for cleanup retry`,
        error instanceof Error ? error.stack : undefined,
      );
      try {
        await this.prisma.mediaUpload.upsert({
          where: { publicId },
          create: {
            publicId,
            brandId,
            requestedBy,
            claimedAt: null,
            expiresAt: new Date(),
          },
          update: { claimedAt: null, expiresAt: new Date() },
        });
      } catch (queueError) {
        this.logger.error(
          `Could not queue cleanup retry for ${publicId}`,
          queueError instanceof Error ? queueError.stack : undefined,
        );
      }
    }
  }

  private metadataFromUpload(upload: {
    assetId: string | null;
    publicId: string;
    secureUrl: string | null;
    width: number | null;
    height: number | null;
    format: string | null;
    bytes: number | null;
    verifiedAt: Date | null;
  }): CloudinaryImageMetadata | null {
    if (
      !upload.verifiedAt ||
      !upload.assetId ||
      !upload.secureUrl ||
      !upload.width ||
      !upload.height ||
      !upload.format ||
      !upload.bytes
    ) {
      return null;
    }
    return {
      assetId: upload.assetId,
      publicId: upload.publicId,
      secureUrl: upload.secureUrl,
      width: upload.width,
      height: upload.height,
      format: upload.format,
      bytes: upload.bytes,
    };
  }

  private unusedUploadWhere(): Prisma.MediaUploadWhereInput {
    return {
      OR: [{ claimedAt: null }, { claimedAt: { isSet: false } }],
    };
  }

  private async throwUploadAuthorizationError(
    publicId: string,
    brandId: string,
    actor: Actor,
  ): Promise<never> {
    const upload = await this.prisma.mediaUpload.findUnique({
      where: { publicId },
    });

    if (!upload) {
      throw new BadRequestException({
        code: 'UPLOAD_AUTHORIZATION_NOT_FOUND',
        message:
          'No upload authorization was found for this image. Request a fresh upload signature and upload the image with the returned publicId.',
        publicId,
      });
    }

    if (upload.brandId !== brandId) {
      throw new BadRequestException({
        code: 'UPLOAD_AUTHORIZATION_BRAND_MISMATCH',
        message:
          'This upload authorization belongs to a different brand from the product you are attaching the image to.',
        publicId,
        expectedBrandId: brandId,
        uploadBrandId: upload.brandId,
      });
    }

    if (upload.requestedBy !== actor.userId) {
      throw new BadRequestException({
        code: 'UPLOAD_AUTHORIZATION_USER_MISMATCH',
        message:
          'This upload authorization was requested by a different account. Use the same account that requested the upload signature.',
        publicId,
      });
    }

    if (upload.claimedAt) {
      throw new BadRequestException({
        code: 'UPLOAD_AUTHORIZATION_ALREADY_USED',
        message:
          'This upload authorization has already been used. Request a fresh upload signature for each image.',
        publicId,
        claimedAt: upload.claimedAt,
      });
    }

    if (upload.expiresAt <= new Date()) {
      throw new BadRequestException({
        code: 'UPLOAD_AUTHORIZATION_EXPIRED',
        message:
          'This upload authorization has expired. Request a fresh upload signature and upload the image again.',
        publicId,
        expiresAt: upload.expiresAt,
      });
    }

    throw new BadRequestException({
      code: 'UPLOAD_AUTHORIZATION_INVALID',
      message:
        'This image does not have a valid unused upload authorization. Request a fresh upload signature and try again.',
      publicId,
    });
  }

  private validateImageMetadata(
    metadata: CloudinaryImageMetadata,
    expectedPublicId: string,
    brandId: string,
  ): void {
    const allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    let host = '';
    try {
      host = new URL(metadata.secureUrl).hostname;
    } catch {}
    if (
      metadata.publicId !== expectedPublicId ||
      !metadata.publicId.startsWith(`gadmar/brands/${brandId}/products/`) ||
      !metadata.assetId ||
      host !== 'res.cloudinary.com' ||
      !Number.isInteger(metadata.width) ||
      metadata.width < 1 ||
      !Number.isInteger(metadata.height) ||
      metadata.height < 1 ||
      !Number.isInteger(metadata.bytes) ||
      metadata.bytes < 1 ||
      metadata.bytes > 10 * 1024 * 1024 ||
      !allowedFormats.includes(metadata.format)
    ) {
      throw new BadRequestException(
        'Cloudinary returned invalid product image metadata',
      );
    }
  }
}
