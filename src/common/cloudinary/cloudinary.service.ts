import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export type ProductImageVariant = 'thumbnail' | 'card' | 'detail' | 'zoom';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUD_KEY'),
      api_secret: this.configService.get<string>('CLOUD_SECRET'),
      secure: true,
    });
  }

  createUploadSignature(publicId: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const uploadPreset = this.configService.getOrThrow<string>(
      'CLOUDINARY_UPLOAD_PRESET',
    );
    const params = {
      public_id: publicId,
      timestamp,
      upload_preset: uploadPreset,
    };
    return {
      publicId,
      timestamp,
      signature: cloudinary.utils.api_sign_request(
        params,
        this.configService.getOrThrow<string>('CLOUD_SECRET'),
      ),
      apiKey: this.configService.getOrThrow<string>('CLOUD_KEY'),
      cloudName: this.configService.getOrThrow<string>('CLOUD_NAME'),
      uploadPreset,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
  }

  productImageUrl(publicId: string, variant: ProductImageVariant): string {
    const sizes = {
      thumbnail: { width: 320, height: 320, crop: 'fill', gravity: 'auto' },
      card: { width: 640, height: 640, crop: 'fill', gravity: 'auto' },
      detail: { width: 1200, crop: 'limit' },
      zoom: { width: 1800, crop: 'limit' },
    } as const;

    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { ...sizes[variant] },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });
  }
}
