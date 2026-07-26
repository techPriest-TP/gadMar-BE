import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import {
  RewardResponseDto,
  RewardStatsDto,
  UserStreakDto,
} from './dto/reward-response.dto';
import { RewardStatus, RewardType, TransactionStatus } from '@prisma/client';

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

    if (reward.status !== RewardStatus.PENDING) {
      throw new NotFoundException('Reward is not available for claiming');
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
        status: RewardStatus.CLAIMED,
        claimedAt: new Date(),
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

  async getRewardStats(userId?: string): Promise<RewardStatsDto> {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const [
      totalRewards,
      pendingRewards,
      claimedRewards,
      expiredRewards,
      totalAmount,
      pendingAmount,
      claimedAmount,
      expiredAmount,
    ] = await Promise.all([
      this.prisma.reward.count({ where }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.PENDING },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.CLAIMED },
      }),
      this.prisma.reward.count({
        where: { ...where, status: RewardStatus.EXPIRED },
      }),
      this.prisma.reward.aggregate({ where, _sum: { amount: true } }),
      this.prisma.reward.aggregate({
        where: { ...where, status: RewardStatus.PENDING },
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
    ]);

    return {
      totalRewards,
      totalAmount: totalAmount._sum.amount || 0,
      pendingRewards,
      pendingAmount: pendingAmount._sum.amount || 0,
      claimedRewards,
      claimedAmount: claimedAmount._sum.amount || 0,
      expiredRewards,
      expiredAmount: expiredAmount._sum.amount || 0,
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
      claimedAt: reward.claimedAt,
      expiresAt: reward.expiresAt,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt,
    };
  }
}
