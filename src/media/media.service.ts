import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { userId: string; role: UserRole };

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
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
    await this.prisma.mediaUpload.create({
      data: {
        publicId,
        brandId,
        requestedBy: actor.userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return {
      ...this.cloudinary.createUploadSignature(publicId),
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
      maxBytes: 10 * 1024 * 1024,
      maxProductImages: 8,
    };
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
          claimedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { claimedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(
          `Image ${publicId} does not have a valid unused upload authorization`,
        );
      }
    }
  }

  async cleanupExpiredUploads(): Promise<number> {
    const uploads = await this.prisma.mediaUpload.findMany({
      where: { claimedAt: null, expiresAt: { lte: new Date() } },
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
}
