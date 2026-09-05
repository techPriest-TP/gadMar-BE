import { ApiProperty } from '@nestjs/swagger';
import { RewardType, RewardStatus } from '@prisma/client';

export class RewardResponseDto {
  @ApiProperty({ example: 'credit-entry-id', description: 'Credit entry ID.' })
  id: string;

  @ApiProperty({ example: 'user-id', description: 'Customer user ID.' })
  userId: string;

  @ApiProperty({
    enum: RewardType,
    example: 'BASE_PURCHASE_CREDIT',
    description:
      'Credit source. Base purchase credits are funded from GadMar commission; bonus types are platform-funded campaign credits.',
  })
  type: RewardType;

  @ApiProperty({
    example: 30000,
    description: 'Credit amount in naira-equivalent GadMar Credits.',
  })
  amount: number;

  @ApiProperty({
    enum: RewardStatus,
    example: 'PENDING',
    description:
      'Credit lifecycle: PENDING waits for brand commission payment, AVAILABLE can be withdrawn, WITHDRAWN has been paid out, EXPIRED is no longer valid, CANCELLED was reversed.',
  })
  status: RewardStatus;

  @ApiProperty({
    required: false,
    example: 'Base GadMar Credits from 40% of GadMar commission',
    description: 'Human-readable reason for the credit entry.',
  })
  description?: string;

  @ApiProperty({
    required: false,
    example: 'transaction-intent-id',
    description: 'Confirmed purchase intent that generated this credit entry.',
  })
  transactionId?: string;

  @ApiProperty({
    required: false,
    example: 'commission-id',
    description:
      'Commission record that unlocks this credit when marked as paid.',
  })
  commissionId?: string;

  @ApiProperty({
    required: false,
    example: '2026-09-05T16:30:00.000Z',
    description: 'Date the credit became withdrawable.',
  })
  availableAt?: Date;

  @ApiProperty({
    required: false,
    example: '2026-09-10T10:00:00.000Z',
    description: 'Legacy claim timestamp; also set when credits are withdrawn.',
  })
  claimedAt?: Date;

  @ApiProperty({
    required: false,
    example: '2026-09-10T10:00:00.000Z',
    description: 'Date GadMar completed the customer withdrawal payout.',
  })
  withdrawnAt?: Date;

  @ApiProperty({
    required: false,
    example: '2026-10-05T16:30:00.000Z',
    description: 'Date pending or available credits expire if unused.',
  })
  expiresAt?: Date;

  @ApiProperty({ example: '2026-09-05T16:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-05T16:30:00.000Z' })
  updatedAt: Date;
}

export class RewardStatsDto {
  @ApiProperty({ example: 12, description: 'Total number of credit entries.' })
  totalRewards: number;

  @ApiProperty({ example: 150000, description: 'Total credit value across all statuses.' })
  totalAmount: number;

  @ApiProperty({ example: 5, description: 'Credits waiting for commission reconciliation.' })
  pendingRewards: number;

  @ApiProperty({ example: 60000, description: 'Pending credit value.' })
  pendingAmount: number;

  @ApiProperty({ example: 4, description: 'Credits ready for withdrawal.' })
  availableRewards: number;

  @ApiProperty({ example: 70000, description: 'Withdrawable credit value.' })
  availableAmount: number;

  @ApiProperty({ example: 2, description: 'Credits already paid out to customers.' })
  withdrawnRewards: number;

  @ApiProperty({ example: 18000, description: 'Credit value already paid out.' })
  withdrawnAmount: number;

  @ApiProperty({ example: 0, description: 'Legacy claimed reward count.' })
  claimedRewards: number;

  @ApiProperty({ example: 0, description: 'Legacy claimed reward value.' })
  claimedAmount: number;

  @ApiProperty({ example: 1, description: 'Expired credit count.' })
  expiredRewards: number;

  @ApiProperty({ example: 2000, description: 'Expired credit value.' })
  expiredAmount: number;

  @ApiProperty({ example: 0, description: 'Cancelled/reversed credit count.' })
  cancelledRewards: number;

  @ApiProperty({ example: 0, description: 'Cancelled/reversed credit value.' })
  cancelledAmount: number;
}

export class CreditSummaryDto extends RewardStatsDto {
  @ApiProperty({
    example: 150000,
    description: 'Lifetime GadMar Credits earned across all statuses.',
  })
  lifetimeCredits: number;

  @ApiProperty({
    example: 70000,
    description:
      'Credits available for withdrawal because the linked brand commission has been paid.',
  })
  withdrawableCredits: number;

  @ApiProperty({
    example: 60000,
    description:
      'Credits earned but still waiting for brand commission reconciliation.',
  })
  pendingCredits: number;
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
