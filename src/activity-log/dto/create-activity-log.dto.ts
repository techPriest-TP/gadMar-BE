import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ActivityType } from '@prisma/client';

export class CreateActivityLogDto {
  @ApiProperty({ example: 'PRODUCT_VIEW', description: 'Activity type', enum: ActivityType })
  @IsEnum(ActivityType)
  @IsNotEmpty()
  type: ActivityType;

  @ApiProperty({ example: 'user-id', description: 'User ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'product-id', description: 'Product ID', required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ example: 'brand-id', description: 'Brand ID', required: false })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ example: 'User viewed product', description: 'Activity message', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ example: { source: 'homepage' }, description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
