import { ApiProperty } from '@nestjs/swagger';
import { RewardType, RewardStatus } from '@prisma/client';

export class RewardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: RewardType })
  type: RewardType;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: RewardStatus })
  status: RewardStatus;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  claimedAt?: Date;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RewardStatsDto {
  @ApiProperty()
  totalRewards: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  pendingRewards: number;

  @ApiProperty()
  pendingAmount: number;

  @ApiProperty()
  claimedRewards: number;

  @ApiProperty()
  claimedAmount: number;

  @ApiProperty()
  expiredRewards: number;

  @ApiProperty()
  expiredAmount: number;
}

export class UserStreakDto {
  @ApiProperty()
  currentStreak: number;

  @ApiProperty()
  longestStreak: number;

  @ApiProperty()
  lastPurchaseDate?: Date;

  @ApiProperty()
  nextRewardAt: number;

  @ApiProperty()
  isEligibleForReward: boolean;
}
