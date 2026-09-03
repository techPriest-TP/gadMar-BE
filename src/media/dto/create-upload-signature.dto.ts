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
      'Signed Cloudinary preset configured with the documented file constraints',
  })
  uploadPreset!: string;
  @ApiProperty({ example: 'gadmar/brands/507f1f77bcf86cd799439011/products' })
  folder!: string;
  @ApiProperty({ example: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] })
  allowedFormats!: string[];
  @ApiProperty({ example: 10485760 }) maxBytes!: number;
  @ApiProperty({ example: 8 }) maxProductImages!: number;
}
