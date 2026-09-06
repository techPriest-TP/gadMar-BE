import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditWithdrawalStatus, RewardStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCreditWithdrawalDto,
  MarkCreditWithdrawalPaidDto,
  RejectCreditWithdrawalDto,
  ReviewCreditWithdrawalDto,
} from './dto/credit-withdrawal.dto';

type Actor = { userId: string; role: UserRole | string };

@Injectable()
export class CreditWithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreateCreditWithdrawalDto) {
    const minimumAmount = this.configService.get<number>(
      'MIN_CREDIT_WITHDRAWAL_AMOUNT',
      1000,
    );
    if (dto.amount < minimumAmount) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ₦${minimumAmount.toLocaleString()}`,
      );
    }

    const availableCredits = await this.prisma.reward.findMany({
      where: { userId, status: RewardStatus.AVAILABLE },
      orderBy: { createdAt: 'asc' },
    });
    const availableAmount = this.money(
      availableCredits.reduce((sum, reward) => sum + reward.amount, 0),
    );
    if (availableAmount < dto.amount) {
      throw new BadRequestException({
        message: 'Insufficient available credits for this withdrawal request',
        code: 'INSUFFICIENT_AVAILABLE_CREDITS',
        availableCredits: availableAmount,
      });
    }

    const selectedCredits: { id: string; amount: number }[] = [];
    let remaining = this.money(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      for (const credit of availableCredits) {
        if (remaining <= 0) break;

        if (credit.amount <= remaining) {
          selectedCredits.push({ id: credit.id, amount: credit.amount });
          remaining = this.money(remaining - credit.amount);
          continue;
        }

        const reservedAmount = remaining;
        const availableRemainder = this.money(credit.amount - remaining);
        const reservedCredit = await tx.reward.update({
          where: { id: credit.id },
          data: { amount: reservedAmount },
        });
        await tx.reward.create({
          data: {
            userId: credit.userId,
            type: credit.type,
            amount: availableRemainder,
            status: RewardStatus.AVAILABLE,
            description: credit.description,
            transactionId: credit.transactionId,
            commissionId: credit.commissionId,
            availableAt: credit.availableAt,
            expiresAt: credit.expiresAt,
          },
        });
        selectedCredits.push({
          id: reservedCredit.id,
          amount: reservedCredit.amount,
        });
        remaining = 0;
      }

      const withdrawal = await tx.creditWithdrawal.create({
        data: {
          userId,
          amount: this.money(dto.amount),
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          note: dto.note,
        },
      });

      await tx.reward.updateMany({
        where: { id: { in: selectedCredits.map((credit) => credit.id) } },
        data: {
          status: RewardStatus.WITHDRAWAL_REQUESTED,
          withdrawalId: withdrawal.id,
        },
      });

      const reservedWithdrawal = await tx.creditWithdrawal.findUniqueOrThrow({
        where: { id: withdrawal.id },
        include: { rewards: { select: { id: true } } },
      });
      return this.map(reservedWithdrawal);
    });
  }

  async findMine(userId: string, options?: { skip?: number; take?: number }) {
    const withdrawals = await this.prisma.creditWithdrawal.findMany({
      where: { userId },
      include: { rewards: { select: { id: true } } },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
    return withdrawals.map((withdrawal) => this.map(withdrawal));
  }

  async findAll(options?: {
    userId?: string;
    status?: CreditWithdrawalStatus;
    skip?: number;
    take?: number;
  }) {
    const withdrawals = await this.prisma.creditWithdrawal.findMany({
      where: {
        userId: options?.userId,
        status: options?.status,
      },
      include: { rewards: { select: { id: true } } },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
    return withdrawals.map((withdrawal) => this.map(withdrawal));
  }

  async findOne(id: string, actor: Actor) {
    const withdrawal = await this.prisma.creditWithdrawal.findUnique({
      where: { id },
      include: { rewards: { select: { id: true } } },
    });
    if (!withdrawal) {
      throw new NotFoundException(`Credit withdrawal ${id} not found`);
    }
    if (actor.role !== UserRole.ADMIN && withdrawal.userId !== actor.userId) {
      throw new ForbiddenException('You can only view your own withdrawals');
    }
    return this.map(withdrawal);
  }

  async approve(id: string, dto: ReviewCreditWithdrawalDto, actor: Actor) {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== CreditWithdrawalStatus.PENDING) {
      throw new BadRequestException('Only pending withdrawals can be approved');
    }
    const updated = await this.prisma.creditWithdrawal.update({
      where: { id },
      data: {
        status: CreditWithdrawalStatus.APPROVED,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
        reviewNote: dto.note,
      },
      include: { rewards: { select: { id: true } } },
    });
    return this.map(updated);
  }

  async reject(id: string, dto: RejectCreditWithdrawalDto, actor: Actor) {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status === CreditWithdrawalStatus.PAID) {
      throw new BadRequestException('Paid withdrawals cannot be rejected');
    }
    if (withdrawal.status === CreditWithdrawalStatus.REJECTED) {
      throw new BadRequestException('Withdrawal is already rejected');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reward.updateMany({
        where: { withdrawalId: id, status: RewardStatus.WITHDRAWAL_REQUESTED },
        data: { status: RewardStatus.AVAILABLE, withdrawalId: null },
      });
      return tx.creditWithdrawal.update({
        where: { id },
        data: {
          status: CreditWithdrawalStatus.REJECTED,
          reviewedById: actor.userId,
          reviewedAt: new Date(),
          rejectionReason: dto.reason,
        },
        include: { rewards: { select: { id: true } } },
      });
    });

    return this.map(updated);
  }

  async markPaid(id: string, dto: MarkCreditWithdrawalPaidDto, actor: Actor) {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== CreditWithdrawalStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved withdrawals can be marked paid',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reward.updateMany({
        where: { withdrawalId: id, status: RewardStatus.WITHDRAWAL_REQUESTED },
        data: {
          status: RewardStatus.WITHDRAWN,
          claimedAt: new Date(),
          withdrawnAt: new Date(),
        },
      });
      return tx.creditWithdrawal.update({
        where: { id },
        data: {
          status: CreditWithdrawalStatus.PAID,
          paidById: actor.userId,
          paidAt: new Date(),
          paymentReference: dto.paymentReference,
          reviewNote: dto.note ?? withdrawal.reviewNote,
        },
        include: { rewards: { select: { id: true } } },
      });
    });

    return this.map(updated);
  }

  private async requireWithdrawal(id: string) {
    const withdrawal = await this.prisma.creditWithdrawal.findUnique({
      where: { id },
    });
    if (!withdrawal) {
      throw new NotFoundException(`Credit withdrawal ${id} not found`);
    }
    return withdrawal;
  }

  private map(withdrawal: any) {
    return {
      id: withdrawal.id,
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      status: withdrawal.status,
      bankName: withdrawal.bankName,
      accountNumber: withdrawal.accountNumber,
      accountName: withdrawal.accountName,
      note: withdrawal.note,
      reviewedById: withdrawal.reviewedById,
      reviewedAt: withdrawal.reviewedAt,
      reviewNote: withdrawal.reviewNote,
      rejectionReason: withdrawal.rejectionReason,
      paidById: withdrawal.paidById,
      paidAt: withdrawal.paidAt,
      paymentReference: withdrawal.paymentReference,
      rewardIds: withdrawal.rewards?.map((reward) => reward.id) ?? [],
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
    };
  }

  private money(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
