import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RewardType, RewardStatus } from '@prisma/client';

export class CreateRewardDto {
  @ApiProperty({ example: 'user-id', description: 'Customer user ID receiving the credit.' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'MANUAL_CREDIT',
    description:
      'Credit type. Admin-created entries should normally use MANUAL_CREDIT; purchase credit types are created automatically.',
    enum: RewardType,
  })
  @IsEnum(RewardType)
  @IsNotEmpty()
  type: RewardType;

  @ApiProperty({ example: 10000, description: 'Credit amount in naira-equivalent GadMar Credits' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    example: 'AVAILABLE',
    description:
      'Credit status. PENDING waits for commission reconciliation; AVAILABLE can be withdrawn; WITHDRAWN has already been paid out.',
    enum: RewardStatus,
    required: false,
  })
  @IsEnum(RewardStatus)
  @IsOptional()
  status?: RewardStatus;

  @ApiProperty({ example: 'Manual onboarding credit', description: 'Credit description shown in customer/admin ledgers.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'transaction-intent-id', description: 'Optional linked purchase intent ID.', required: false })
  @IsMongoId()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ example: 'commission-id', description: 'Optional linked commission ID that unlocks pending credits when paid.', required: false })
  @IsMongoId()
  @IsOptional()
  commissionId?: string;

  @ApiProperty({ example: '2026-12-31T23:59:59Z', description: 'Credit expiry date', required: false })
  @IsOptional()
  expiresAt?: Date;
}
