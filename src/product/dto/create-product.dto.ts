import { ApiProperty } from '@nestjs/swagger';
import { NigerianRegion, ProductCondition, StockStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductImageInputDto {
  @ApiProperty({
    example: 'gadmar/brands/507f1f77bcf86cd799439011/products/phone-front',
  })
  @IsString()
  publicId: string;
  @ApiProperty({ required: false, example: 'Front view of iPhone 15 Pro Max' })
  @IsString()
  @IsOptional()
  altText?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max' }) @IsString() name: string;
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
  @ApiProperty({ example: 1500000 }) @IsNumber() @Min(0) price: number;
  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  oldPrice?: number;
  @ApiProperty({ type: [ProductImageInputDto], required: false, maxItems: 8 })
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique((image: ProductImageInputDto) => image.publicId)
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  @IsOptional()
  images?: ProductImageInputDto[];
  @ApiProperty({ example: 'Smartphones' }) @IsString() category: string;
  @ApiProperty({ enum: ProductCondition, required: false })
  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;
  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, unknown>;
  @ApiProperty({ enum: StockStatus, required: false })
  @IsEnum(StockStatus)
  @IsOptional()
  stockStatus?: StockStatus;
  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  warrantyInformation?: string;
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  returnsInformation?: string;
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  rewardEligible?: boolean;
  @ApiProperty({ enum: NigerianRegion, required: false })
  @IsEnum(NigerianRegion)
  @IsOptional()
  region?: NigerianRegion;
  @ApiProperty({ required: false }) @IsString() @IsOptional() state?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() lga?: string;
  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deliveryStates?: string[];
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  nationwideDelivery?: boolean;
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  pickupAvailable?: boolean;
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  inspectionAvailable?: boolean;
  @ApiProperty() @IsMongoId() brandId: string;
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
