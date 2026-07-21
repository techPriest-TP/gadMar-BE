import { ApiProperty, PartialType } from '@nestjs/swagger';
import { BrandStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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
