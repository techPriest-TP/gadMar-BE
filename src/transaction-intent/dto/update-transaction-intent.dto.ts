import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export class UpdateTransactionIntentDto {
  @ApiProperty({ example: 'COMPLETED', description: 'Transaction status', enum: TransactionStatus })
  @IsString()
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({ example: 2500000, description: 'Transaction amount', required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ example: 125000, description: 'Commission amount', required: false })
  @IsNumber()
  @IsOptional()
  commission?: number;
}
