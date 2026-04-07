import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  category: string;

  @ApiProperty()
  brandId: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ProductWithBrandDto extends ProductResponseDto {
  @ApiProperty({ description: 'Brand information' })
  brand: {
    id: string;
    name: string;
    logo?: string;
    whatsappLink: string;
  };
}
