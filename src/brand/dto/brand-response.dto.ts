import { ApiProperty } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  logo?: string;

  @ApiProperty({ required: false })
  about?: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  whatsappLink: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty({ required: false })
  featuredUntil?: Date;

  @ApiProperty()
  commissionRate: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BrandWithStatsDto extends BrandResponseDto {
  @ApiProperty({ description: 'Total number of products' })
  productCount: number;

  @ApiProperty({ description: 'Total transaction intents' })
  transactionCount: number;

  @ApiProperty({ description: 'Completed transactions' })
  completedTransactions: number;

  @ApiProperty({ description: 'Pending transactions' })
  pendingTransactions: number;

  @ApiProperty({ description: 'Total sales amount' })
  totalSales: number;
}
