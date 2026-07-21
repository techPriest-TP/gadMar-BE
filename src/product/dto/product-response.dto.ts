import { ApiProperty } from '@nestjs/swagger';
import { BrandStatus, NigerianRegion, ProductCondition, StockStatus } from '@prisma/client';

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false }) description?: string;
  @ApiProperty() price: number;
  @ApiProperty({ required: false }) oldPrice?: number;
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty() category: string;
  @ApiProperty({ enum: ProductCondition }) condition: ProductCondition;
  @ApiProperty({ required: false, type: Object }) specifications?: Record<string, unknown>;
  @ApiProperty({ enum: StockStatus }) stockStatus: StockStatus;
  @ApiProperty({ required: false }) stockQuantity?: number;
  @ApiProperty({ required: false }) warrantyInformation?: string;
  @ApiProperty({ required: false }) returnsInformation?: string;
  @ApiProperty() rewardEligible: boolean;
  @ApiProperty({ enum: NigerianRegion, required: false }) region?: NigerianRegion;
  @ApiProperty({ required: false }) state?: string;
  @ApiProperty({ required: false }) lga?: string;
  @ApiProperty({ type: [String] }) deliveryStates: string[];
  @ApiProperty() nationwideDelivery: boolean;
  @ApiProperty() pickupAvailable: boolean;
  @ApiProperty() inspectionAvailable: boolean;
  @ApiProperty() brandId: string;
  @ApiProperty() isFeatured: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ProductWithBrandDto extends ProductResponseDto {
  @ApiProperty()
  brand: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    whatsappLink: string;
    verificationStatus: BrandStatus;
  };
}
