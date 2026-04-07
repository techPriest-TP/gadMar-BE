import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'MacBook Pro 16"', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Latest M3 chip, 16GB RAM, 512GB SSD...', description: 'Product description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 2500000, description: 'Product price in NGN' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    description: 'Product image URLs',
    type: [String],
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 'Laptops', description: 'Product category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'brand-id', description: 'Brand ID' })
  @IsString()
  @IsNotEmpty()
  brandId: string;

  @ApiProperty({ example: true, description: 'Is product active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
