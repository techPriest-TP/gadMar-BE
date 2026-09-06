import { ApiProperty, PartialType } from '@nestjs/swagger';
import { BrandStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateBrandDto } from './create-brand.dto';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}

export class ReviewBrandDto {
  @ApiProperty({ enum: BrandStatus })
  @IsEnum(BrandStatus)
  status: BrandStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBrandPurchaseConfirmationTrustDto {
  @ApiProperty({
    example: true,
    description:
      'Allows the brand to confirm WhatsApp purchases directly from its dashboard.',
  })
  @IsBoolean()
  canDirectlyConfirmPurchases: boolean;

  @ApiProperty({
    required: false,
    example: 'Enabled after consistent commission payment history.',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
