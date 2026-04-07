import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '@prisma/client';

export class TransactionIntentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  brandId: string;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty()
  refCode: string;

  @ApiProperty({ required: false })
  amount?: number;

  @ApiProperty({ required: false })
  commission?: number;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TransactionIntentWithDetailsDto extends TransactionIntentResponseDto {
  @ApiProperty({ description: 'Product information' })
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
  };

  @ApiProperty({ description: 'Brand information' })
  brand: {
    id: string;
    name: string;
    whatsappLink: string;
  };

  @ApiProperty({ description: 'WhatsApp URL for transaction' })
  whatsappUrl: string;
}
