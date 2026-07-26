import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseIntentItemDto {
  @ApiProperty({ example: 'product-id' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateTransactionIntentDto {
  @ApiProperty({ type: [PurchaseIntentItemDto], description: 'Cart items; they are grouped into one intent per brand.' })
  @IsArray()
  items: PurchaseIntentItemDto[];

  @ApiPropertyOptional({ example: 'Ada Lovelace', description: 'Required for guest checkout.' })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional({ example: '+2348012345678', description: 'Required for guest checkout.' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 'ada@example.com' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}
