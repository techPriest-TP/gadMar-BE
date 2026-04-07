import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransactionIntentDto {
  @ApiProperty({ example: 'product-id', description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'brand-id', description: 'Brand ID' })
  @IsString()
  @IsNotEmpty()
  brandId: string;

  @ApiProperty({ example: 2500000, description: 'Transaction amount', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;
}
