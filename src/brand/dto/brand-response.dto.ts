import { ApiProperty } from '@nestjs/swagger';
import { BrandStatus, NigerianRegion } from '@prisma/client';
import { ProductResponseDto } from '../../product/dto/product-response.dto';

export class BrandResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false }) logo?: string;
  @ApiProperty({ required: false }) banner?: string;
  @ApiProperty({ required: false }) about?: string;
  @ApiProperty() phone: string;
  @ApiProperty() whatsappLink: string;
  @ApiProperty({ required: false }) email?: string;
  @ApiProperty({ required: false }) websiteUrl?: string;
  @ApiProperty({ type: [String] }) socialLinks: string[];
  @ApiProperty({ enum: BrandStatus }) verificationStatus: BrandStatus;
  @ApiProperty({ required: false }) warrantyPolicy?: string;
  @ApiProperty({ required: false }) returnsPolicy?: string;
  @ApiProperty({ enum: NigerianRegion, required: false }) region?: NigerianRegion;
  @ApiProperty({ required: false }) state?: string;
  @ApiProperty({ required: false }) lga?: string;
  @ApiProperty({ type: [String] }) deliveryStates: string[];
  @ApiProperty({ type: [String] }) pickupLocations: string[];
  @ApiProperty({ type: [String] }) inspectionLocations: string[];
  @ApiProperty() nationwideDelivery: boolean;
  @ApiProperty() isFeatured: boolean;
  @ApiProperty({ required: false }) featuredUntil?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class BrandWithStatsDto extends BrandResponseDto {
  @ApiProperty() productCount: number;
  @ApiProperty() transactionCount: number;
  @ApiProperty() completedTransactions: number;
  @ApiProperty() pendingTransactions: number;
  @ApiProperty() totalSales: number;
}

export class BrandStorefrontDto {
  @ApiProperty({ type: BrandResponseDto }) brand: BrandResponseDto;
  @ApiProperty({ type: () => [ProductResponseDto] }) products: ProductResponseDto[];
}
