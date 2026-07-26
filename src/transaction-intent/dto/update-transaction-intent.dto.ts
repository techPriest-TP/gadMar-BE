import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export class UpdateTransactionIntentDto {
  @ApiProperty({
    example: 'CONFIRMED',
    description: 'Purchase intent status',
    enum: TransactionStatus,
  })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({
    example: 2500000,
    description: 'Required when confirming the final agreed amount',
    required: false,
  })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  finalAmount?: number;
}
