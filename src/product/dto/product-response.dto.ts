import { ApiProperty } from '@nestjs/swagger';
import {
  BrandStatus,
  NigerianRegion,
  ProductCondition,
  StockStatus,
} from '@prisma/client';

export class ProductImageVariantsDto {
  @ApiProperty() thumbnail: string;
  @ApiProperty() card: string;
  @ApiProperty() detail: string;
  @ApiProperty() zoom: string;
}

export class ProductImageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() publicId: string;
  @ApiProperty() secureUrl: string;
  @ApiProperty() width: number;
  @ApiProperty() height: number;
  @ApiProperty() format: string;
  @ApiProperty() bytes: number;
  @ApiProperty({ required: false, nullable: true }) altText?: string | null;
  @ApiProperty() position: number;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty({ type: ProductImageVariantsDto })
  variants: ProductImageVariantsDto;
}

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false, nullable: true }) description?: string | null;
  @ApiProperty() price: number;
  @ApiProperty({ required: false, nullable: true }) oldPrice?: number | null;
  @ApiProperty({ type: [ProductImageResponseDto] })
  images: ProductImageResponseDto[];
  @ApiProperty() category: string;
  @ApiProperty({ enum: ProductCondition }) condition: ProductCondition;
  @ApiProperty({ required: false, type: Object }) specifications?: unknown;
  @ApiProperty({ enum: StockStatus }) stockStatus: StockStatus;
  @ApiProperty({ required: false, nullable: true }) stockQuantity?: number | null;
  @ApiProperty({ required: false, nullable: true }) warrantyInformation?: string | null;
  @ApiProperty({ required: false, nullable: true }) returnsInformation?: string | null;
  @ApiProperty() rewardEligible: boolean;
  @ApiProperty({ enum: NigerianRegion, required: false, nullable: true })
  region?: NigerianRegion | null;
  @ApiProperty({ required: false, nullable: true }) state?: string | null;
  @ApiProperty({ required: false, nullable: true }) lga?: string | null;
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
