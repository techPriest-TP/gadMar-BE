import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RewardType, RewardStatus } from '@prisma/client';

export class UpdateRewardDto {
  @ApiProperty({
    example: 'MANUAL_CREDIT',
    description: 'Credit type/source. Use carefully because this changes ledger meaning.',
    enum: RewardType,
    required: false,
  })
  @IsEnum(RewardType)
  @IsOptional()
  type?: RewardType;

  @ApiProperty({ example: 5000, description: 'Credit amount in naira-equivalent GadMar Credits.', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({
    example: 'AVAILABLE',
    description:
      'Credit status. Prefer commission payment to move purchase credits from PENDING to AVAILABLE automatically.',
    enum: RewardStatus,
    required: false,
  })
  @IsEnum(RewardStatus)
  @IsOptional()
  status?: RewardStatus;

  @ApiProperty({ example: 'Manual customer credit adjustment', description: 'Credit description shown in customer/admin ledgers.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'transaction-intent-id', description: 'Linked purchase intent ID', required: false })
  @IsMongoId()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ example: 'commission-id', description: 'Linked commission ID', required: false })
  @IsMongoId()
  @IsOptional()
  commissionId?: string;

  @ApiProperty({ example: '2026-12-31T23:59:59Z', description: 'Credit expiry date', required: false })
  @IsOptional()
  expiresAt?: Date;
}
