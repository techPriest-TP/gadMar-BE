import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiProperty({ example: 'MacBook Pro 16"', description: 'Product name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Latest M3 chip, 16GB RAM, 512GB SSD...', description: 'Product description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 2500000, description: 'Product price in NGN', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    description: 'Product image URLs',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 'Laptops', description: 'Product category', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'brand-id', description: 'Brand ID', required: false })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ example: true, description: 'Is product active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
