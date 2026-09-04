import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export type ProductImageVariant = 'thumbnail' | 'card' | 'detail' | 'zoom';

export type CloudinaryImageMetadata = {
  assetId: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

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

  createUploadSignature(publicId: string, notificationUrl: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const uploadPreset = this.configService.getOrThrow<string>(
      'CLOUDINARY_UPLOAD_PRESET',
    );
    const params = {
      public_id: publicId,
      notification_url: notificationUrl,
      timestamp,
      upload_preset: uploadPreset,
    };
    return {
      publicId,
      notificationUrl,
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

  verifyNotificationSignature(
    rawBody: string,
    timestamp: number,
    signature: string,
  ): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(timestamp) || timestamp > now + 300) return false;
    return cloudinary.utils.verifyNotificationSignature(
      rawBody,
      timestamp,
      signature,
      2 * 60 * 60,
    );
  }

  async getImageMetadata(publicId: string): Promise<CloudinaryImageMetadata> {
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
      type: 'upload',
    });
    return this.normalizeImageMetadata(resource);
  }

  normalizeImageMetadata(
    resource: Record<string, unknown>,
  ): CloudinaryImageMetadata {
    return {
      assetId: String(resource.asset_id || ''),
      publicId: String(resource.public_id || ''),
      secureUrl: String(resource.secure_url || ''),
      width: Number(resource.width),
      height: Number(resource.height),
      format: String(resource.format || '').toLowerCase(),
      bytes: Number(resource.bytes),
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
