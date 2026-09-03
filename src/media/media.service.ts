import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

type Actor = { userId: string; role: UserRole };

@Injectable()
export class MediaService {
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
    return {
      ...this.cloudinary.createUploadSignature(folder),
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
      maxBytes: 10 * 1024 * 1024,
      maxProductImages: 8,
    };
  }
}
