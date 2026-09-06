import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import {
  CreditSummaryDto,
  RewardResponseDto,
  RewardStatsDto,
  UserStreakDto,
} from './dto/reward-response.dto';
import { RewardStatus, RewardType, TransactionStatus } from '@prisma/client';

type ConfirmedIntentForCredits = {
  id: string;
  userId: string | null;
  finalAmount: number | null;
  amount: number | null;
  commission: number | null;
  status: TransactionStatus;
  brand: { commissionRate: number };
  commissionRecord: { id: string; status: RewardStatus | string } | null;
  items: {
    productId: string;
    unitPrice: number;
    quantity: number;
    rewardEligible: boolean;
  }[];
};

@Injectable()
export class RewardService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(createDto: CreateRewardDto): Promise<RewardResponseDto> {
    const reward = await this.prisma.reward.create({
      data: createDto,
    });

    return this.mapToRewardResponse(reward);
  }

  async findAll(options?: {
    userId?: string;
    status?: RewardStatus;
    type?: RewardType;
    skip?: number;
    take?: number;
  }): Promise<RewardResponseDto[]> {
    const where: any = {};

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.type) {
      where.type = options.type;
    }

    const rewards = await this.prisma.reward.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return rewards.map(this.mapToRewardResponse);
  }

  async findOne(id: string): Promise<RewardResponseDto> {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID ${id} not found`);
    }

    return this.mapToRewardResponse(reward);
  }

  async findByUser(userId: string): Promise<RewardResponseDto[]> {
    const rewards = await this.prisma.reward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rewards.map(this.mapToRewardResponse);
  }

  async update(
    id: string,
    updateDto: UpdateRewardDto,
  ): Promise<RewardResponseDto> {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID ${id} not found`);
    }

    const data: any = { ...updateDto };

    // Set claimedAt if status is being changed to CLAIMED
    if (
      updateDto.status === RewardStatus.CLAIMED &&
      reward.status !== RewardStatus.CLAIMED
    ) {
      data.claimedAt = new Date();
    }

    const updatedReward = await this.prisma.reward.update({
      where: { id },
      data,
    });

    return this.mapToRewardResponse(updatedReward);
  }

  async claimReward(id: string): Promise<RewardResponseDto> {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID ${id} not found`);
    }

    if (reward.status !== RewardStatus.AVAILABLE) {
      throw new BadRequestException('Only available credits can be withdrawn');
    }

    if (reward.expiresAt && reward.expiresAt < new Date()) {
      await this.prisma.reward.update({
        where: { id },
        data: { status: RewardStatus.EXPIRED },
      });
      throw new NotFoundException('Reward has expired');
    }

    const updatedReward = await this.prisma.reward.update({
      where: { id },
      data: {
        status: RewardStatus.WITHDRAWN,
        claimedAt: new Date(),
        withdrawnAt: new Date(),
      },
    });

    return this.mapToRewardResponse(updatedReward);
  }

  async remove(id: string): Promise<void> {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with ID ${id} not found`);
    }

    await this.prisma.reward.delete({
      where: { id },
    });
  }

  async getUserStreak(userId: string): Promise<UserStreakDto> {
    // Get user's completed transactions
    const transactions = await this.prisma.transactionIntent.findMany({
      where: {
        userId,
        status: TransactionStatus.CONFIRMED,
        items: { some: { rewardEligible: true } },
      },
      distinct: ['batchId'],
      orderBy: { createdAt: 'desc' },
    });

    // Calculate current streak (consecutive completed transactions within 30 days)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    let lastPurchaseDate: Date | null = null;

    const now = new Date();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    for (const transaction of transactions) {
      if (!lastPurchaseDate) {
        lastPurchaseDate = transaction.createdAt;
      }

      if (!lastDate) {
        lastDate = transaction.createdAt;
        tempStreak = 1;
      } else {
        const diff = lastDate.getTime() - transaction.createdAt.getTime();
        if (diff <= thirtyDaysInMs) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        lastDate = transaction.createdAt;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Check if current streak is still valid (last transaction within 30 days)
    if (lastPurchaseDate) {
      const daysSinceLastPurchase =
        (now.getTime() - lastPurchaseDate.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceLastPurchase <= 30) {
        currentStreak = tempStreak;
      }
    }

    const streakThreshold = this.configService.get<number>(
      'STREAK_THRESHOLD',
      3,
    );
    const nextRewardAt = Math.max(
      0,
      streakThreshold - (currentStreak % streakThreshold),
    );
    const isEligibleForReward =
      currentStreak > 0 && currentStreak % streakThreshold === 0;

    return {
      currentStreak,
      longestStreak,
      lastPurchaseDate: lastPurchaseDate || undefined,
      nextRewardAt,
      isEligibleForReward,
    };
  }

  async checkAndIssueStreakReward(
    userId: string,
  ): Promise<RewardResponseDto | null> {
    const streak = await this.getUserStreak(userId);
    const streakThreshold = this.configService.get<number>(
      'STREAK_THRESHOLD',
      3,
    );

    // Check if user has reached streak threshold
    if (
      streak.currentStreak > 0 &&
      streak.currentStreak % streakThreshold === 0
    ) {
      // Check if reward already issued for this streak milestone
      const existingReward = await this.prisma.reward.findFirst({
        where: {
          userId,
          type: RewardType.PURCHASE_STREAK,
          createdAt: {
            gte: streak.lastPurchaseDate,
          },
        },
      });

      if (!existingReward) {
        // Issue new reward
        const rewardAmount = this.configService.get<number>(
          'STREAK_REWARD_AMOUNT',
          3000,
        );
        const rewardExpiryDays = this.configService.get<number>(
          'REWARD_EXPIRY_DAYS',
          30,
        );
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + rewardExpiryDays);

        const reward = await this.prisma.reward.create({
          data: {
            userId,
            type: RewardType.PURCHASE_STREAK,
            amount: rewardAmount,
            status: RewardStatus.PENDING,
            description: `${streak.currentStreak} purchase streak reward`,
            expiresAt,
          },
        });

        return this.mapToRewardResponse(reward);
      }
    }

    return null;
  }

  async issuePurchaseCreditsForConfirmedIntent(
    transactionId: string,
  ): Promise<RewardResponseDto[]> {
    const intent = await this.prisma.transactionIntent.findUnique({
      where: { id: transactionId },
      include: {
        brand: { select: { commissionRate: true } },
        items: true,
        commissionRecord: { select: { id: true, status: true } },
      },
    });

    if (!intent) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

    return this.issuePurchaseCredits(intent as ConfirmedIntentForCredits);
  }

  async issuePurchaseCredits(
    intent: ConfirmedIntentForCredits,
  ): Promise<RewardResponseDto[]> {
    if (
      intent.status !== TransactionStatus.CONFIRMED ||
      !intent.userId ||
      !intent.finalAmount
    ) {
      return [];
    }

    const eligibleItems = intent.items.filter((item) => item.rewardEligible);
    if (eligibleItems.length === 0) return [];

    const commissionRate = intent.brand.commissionRate ?? 5;
    const commissionAmount =
      intent.commission ?? (intent.finalAmount * commissionRate) / 100;
    const eligibleSnapshotAmount = eligibleItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const originalIntentAmount = intent.amount || eligibleSnapshotAmount;
    const eligibleFinalAmount =
      originalIntentAmount > 0
        ? intent.finalAmount * (eligibleSnapshotAmount / originalIntentAmount)
        : intent.finalAmount;
    const eligibleCommissionAmount =
      (eligibleFinalAmount * commissionRate) / 100;
    const customerRewardShare = this.customerRewardShare();
    const baseCredits = this.money(
      eligibleCommissionAmount * customerRewardShare,
    );
    const commissionId = intent.commissionRecord?.id;
    const initialStatus =
      intent.commissionRecord?.status === 'PAID'
        ? RewardStatus.AVAILABLE
        : RewardStatus.PENDING;
    const availableAt =
      initialStatus === RewardStatus.AVAILABLE ? new Date() : undefined;
    const expiresAt = this.creditExpiryDate();
    const creditsToCreate: {
      type: RewardType;
      amount: number;
      description: string;
    }[] = [];

    if (baseCredits > 0) {
      creditsToCreate.push({
        type: RewardType.BASE_PURCHASE_CREDIT,
        amount: baseCredits,
        description: `Base GadMar Credits from ${this.percent(customerRewardShare)} of GadMar commission`,
      });
    }

    if (await this.qualifiesForFirstPurchaseBonus(intent)) {
      const amount = this.configService.get<number>(
        'FIRST_PURCHASE_BONUS_AMOUNT',
        5000,
      );
      creditsToCreate.push({
        type: RewardType.FIRST_PURCHASE_BONUS,
        amount,
        description: 'First confirmed purchase bonus credits',
      });
    }

    if (this.launchCampaignBonusEnabled()) {
      const amount = this.configService.get<number>(
        'LAUNCH_CAMPAIGN_BONUS_AMOUNT',
        5000,
      );
      creditsToCreate.push({
        type: RewardType.LAUNCH_CAMPAIGN_BONUS,
        amount,
        description: 'Launch campaign bonus credits',
      });
    }

    const categoryBoostAmount = await this.categoryBoostAmount(intent);
    if (categoryBoostAmount > 0) {
      creditsToCreate.push({
        type: RewardType.CATEGORY_BOOST_BONUS,
        amount: categoryBoostAmount,
        description: 'Reward-boosted category bonus credits',
      });
    }

    const issued: RewardResponseDto[] = [];
    for (const credit of creditsToCreate) {
      const existing = await this.prisma.reward.findFirst({
        where: {
          userId: intent.userId,
          transactionId: intent.id,
          type: credit.type,
        },
      });
      if (existing) {
        issued.push(this.mapToRewardResponse(existing));
        continue;
      }

      const reward = await this.prisma.reward.create({
        data: {
          userId: intent.userId,
          type: credit.type,
          amount: credit.amount,
          status: initialStatus,
          description: credit.description,
          transactionId: intent.id,
          commissionId,
          availableAt,
          expiresAt,
        },
      });
      issued.push(this.mapToRewardResponse(reward));
    }

    return issued;
  }

  async unlockCreditsForPaidCommission(commissionId: string): Promise<number> {
    const result = await this.prisma.reward.updateMany({
      where: {
        commissionId,
        status: RewardStatus.PENDING,
      },
      data: {
        status: RewardStatus.AVAILABLE,
        availableAt: new Date(),
      },
    });

    return result.count;
  }

  async getCreditSummary(userId?: string): Promise<CreditSummaryDto> {
    const stats = await this.getRewardStats(userId);
    return {
      ...stats,
      lifetimeCredits: stats.totalAmount,
      withdrawableCredits: stats.availableAmount,
      pendingCredits: stats.pendingAmount,
      withdrawalRequestedCredits: stats.withdrawalRequestedAmount,
    };
  }

  async getRewardStats(userId?: string): Promise<RewardStatsDto> {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const [
      totalRewards,
      pendingRewards,
      availableRewards,
      withdrawnRewards,
      withdrawalRequestedRewards,
      claimedRewards,
      expiredRewards,
      cancelledRewards,
      totalAmount,
      pendingAmount,
      availableAmount,
      withdrawnAmount,
      withdrawalRequestedAmount,
      claimedAmount,
      expiredAmount,
      cancelledAmount,
    ] = await Promise.all([
      this.prisma.reward.count({ where }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.PENDING },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.AVAILABLE },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.WITHDRAWN },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.WITHDRAWAL_REQUESTED },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.CLAIMED },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.EXPIRED },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.CANCELLED },
      }),
      this.prisma.reward.aggregate({ where, _sum: { amount: true } }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.AVAILABLE },
        _sum: { amount: true },
      }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.WITHDRAWN },
        _sum: { amount: true },
      }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.WITHDRAWAL_REQUESTED },
        _sum: { amount: true },
      }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.CLAIMED },
        _sum: { amount: true },
      }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.EXPIRED },
        _sum: { amount: true },
      }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.CANCELLED },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalRewards,
      totalAmount: totalAmount._sum.amount || 0,
      pendingRewards,
      pendingAmount: pendingAmount._sum.amount || 0,
      availableRewards,
      availableAmount: availableAmount._sum.amount || 0,
      withdrawnRewards,
      withdrawnAmount: withdrawnAmount._sum.amount || 0,
      withdrawalRequestedRewards,
      withdrawalRequestedAmount: withdrawalRequestedAmount._sum.amount || 0,
      claimedRewards,
      claimedAmount: claimedAmount._sum.amount || 0,
      expiredRewards,
      expiredAmount: expiredAmount._sum.amount || 0,
      cancelledRewards,
      cancelledAmount: cancelledAmount._sum.amount || 0,
    };
  }

  async expireOldRewards(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.reward.updateMany({
      where: {
        status: RewardStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: RewardStatus.EXPIRED,
      },
    });

    return result.count;
  }

  private mapToRewardResponse(reward: any): RewardResponseDto {
    return {
      id: reward.id,
      userId: reward.userId,
      type: reward.type,
      amount: reward.amount,
      status: reward.status,
      description: reward.description,
      transactionId: reward.transactionId,
      commissionId: reward.commissionId,
      withdrawalId: reward.withdrawalId,
      availableAt: reward.availableAt,
      claimedAt: reward.claimedAt,
      withdrawnAt: reward.withdrawnAt,
      expiresAt: reward.expiresAt,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt,
    };
  }

  private customerRewardShare(): number {
    const configured = this.configService.get<number>(
      'PLATFORM_CUSTOMER_REWARD_SHARE',
      0.4,
    );
    if (!Number.isFinite(configured)) return 0.4;
    return Math.min(Math.max(configured, 0), 1);
  }

  private creditExpiryDate(): Date {
    const days = this.configService.get<number>('REWARD_EXPIRY_DAYS', 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  private async qualifiesForFirstPurchaseBonus(
    intent: ConfirmedIntentForCredits,
  ): Promise<boolean> {
    const threshold = this.configService.get<number>(
      'FIRST_PURCHASE_BONUS_THRESHOLD',
      250000,
    );
    if (!intent.userId || !intent.finalAmount || intent.finalAmount < threshold)
      return false;

    const confirmedEligiblePurchases =
      await this.prisma.transactionIntent.count({
        where: {
          userId: intent.userId,
          status: TransactionStatus.CONFIRMED,
          items: { some: { rewardEligible: true } },
        },
      });

    return confirmedEligiblePurchases === 1;
  }

  private launchCampaignBonusEnabled(): boolean {
    const configured = this.configService.get<string | boolean>(
      'LAUNCH_CAMPAIGN_BONUS_ENABLED',
      false,
    );
    return configured === true || String(configured).toLowerCase() === 'true';
  }

  private async categoryBoostAmount(
    intent: ConfirmedIntentForCredits,
  ): Promise<number> {
    const configured = this.configService.get<string>(
      'REWARD_BOOSTED_CATEGORIES',
      '',
    );
    const boostedCategories = configured
      .split(',')
      .map((category) => category.trim().toLowerCase())
      .filter(Boolean);
    if (boostedCategories.length === 0) return 0;

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: intent.items.map((item) => item.productId) },
        category: { in: boostedCategories, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (products.length === 0) return 0;
    return this.configService.get<number>('CATEGORY_BOOST_BONUS_AMOUNT', 2000);
  }

  private money(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  private percent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
}
