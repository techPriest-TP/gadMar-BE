import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateUploadSignatureDto {
  @ApiProperty({ description: 'Brand receiving the uploaded product images' })
  @IsMongoId()
  brandId!: string;
}

export class UploadSignatureResponseDto {
  @ApiProperty() timestamp!: number;
  @ApiProperty() signature!: string;
  @ApiProperty() apiKey!: string;
  @ApiProperty() cloudName!: string;
  @ApiProperty({
    description:
      'Single-use value to send to Cloudinary as public_id and later submit with the product image metadata',
  })
  publicId!: string;
  @ApiProperty({
    description: 'Send this value to Cloudinary as notification_url',
  })
  notificationUrl!: string;
  @ApiProperty({
    description:
      'Signed Cloudinary preset configured with the documented file constraints',
  })
  uploadPreset!: string;
  @ApiProperty({ example: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] })
  allowedFormats!: string[];
  @ApiProperty({ example: 10485760 }) maxBytes!: number;
  @ApiProperty({ example: 8 }) maxProductImages!: number;
}
