import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Apple', description: 'Brand name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://example.com/logo.png', description: 'Brand logo URL', required: false })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiProperty({ example: 'Premium technology products...', description: 'Brand description', required: false })
  @IsString()
  @IsOptional()
  about?: string;

  @ApiProperty({ example: '+2348012345678', description: 'Brand contact phone' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'https://wa.me/2348012345678', description: 'WhatsApp link' })
  @IsUrl()
  @IsNotEmpty()
  whatsappLink: string;

  @ApiProperty({ example: 'brand@example.com', description: 'Brand email', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: false, description: 'Is featured brand', required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Featured until date', required: false })
  @IsOptional()
  featuredUntil?: Date;

  @ApiProperty({ example: 5.0, description: 'Commission rate percentage', required: false })
  @IsNumber()
  @IsOptional()
  commissionRate?: number;

  @ApiProperty({ example: 'user-id', description: 'Brand owner user ID', required: false })
  @IsString()
  @IsOptional()
  ownerId?: string;
}
