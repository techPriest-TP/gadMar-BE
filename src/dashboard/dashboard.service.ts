import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BrandStatus,
  CommissionStatus,
  ConfirmationProofStatus,
  CreditWithdrawalStatus,
  RewardStatus,
  TransactionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    const [
      totalPurchases,
      pendingPurchases,
      contactedPurchases,
      confirmedPurchases,
      cancelledPurchases,
      pendingCredits,
      availableCredits,
      withdrawalRequestedCredits,
      withdrawnCredits,
      pendingWithdrawals,
      paidWithdrawals,
      recentPurchases,
      recentCredits,
      recentWithdrawals,
    ] = await Promise.all([
      this.prisma.transactionIntent.count({ where: { userId } }),
      this.prisma.transactionIntent.count({
        where: { userId, status: TransactionStatus.PENDING },
      }),
      this.prisma.transactionIntent.count({
        where: { userId, status: TransactionStatus.CONTACTED },
      }),
      this.prisma.transactionIntent.count({
        where: { userId, status: TransactionStatus.CONFIRMED },
      }),
      this.prisma.transactionIntent.count({
        where: { userId, status: TransactionStatus.CANCELLED },
      }),
      this.sumRewards(userId, RewardStatus.PENDING),
      this.sumRewards(userId, RewardStatus.AVAILABLE),
      this.sumRewards(userId, RewardStatus.WITHDRAWAL_REQUESTED),
      this.sumRewards(userId, RewardStatus.WITHDRAWN),
      this.sumWithdrawals({ userId, status: CreditWithdrawalStatus.PENDING }),
      this.sumWithdrawals({ userId, status: CreditWithdrawalStatus.PAID }),
      this.prisma.transactionIntent.findMany({
        where: { userId },
        include: this.intentInclude(),
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reward.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditWithdrawal.findMany({
        where: { userId },
        include: { rewards: { select: { id: true } } },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      user,
      cards: {
        totalPurchases,
        pendingPurchases,
        contactedPurchases,
        confirmedPurchases,
        cancelledPurchases,
        pendingCredits,
        withdrawableCredits: availableCredits,
        withdrawalRequestedCredits,
        withdrawnCredits,
        pendingWithdrawalAmount: pendingWithdrawals,
        paidWithdrawalAmount: paidWithdrawals,
      },
      recentPurchases,
      recentCredits,
      recentWithdrawals: recentWithdrawals.map((withdrawal) =>
        this.mapWithdrawal(withdrawal),
      ),
    };
  }

  async getBrandOwnerDashboard(userId: string) {
    const brands = await this.prisma.brand.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    const brandIds = brands.map((brand) => brand.id);

    if (brandIds.length === 0) {
      return {
        brands: [],
        cards: this.emptyBrandCards(),
        directConfirmation: [],
        recentPurchaseIntents: [],
        recentCommissions: [],
      };
    }

    const [
      totalProducts,
      activeProducts,
      pendingPurchaseIntents,
      contactedPurchaseIntents,
      confirmedPurchases,
      confirmedSales,
      pendingCommissions,
      paidCommissions,
      pendingProofs,
      recentPurchaseIntents,
      recentCommissions,
    ] = await Promise.all([
      this.prisma.product.count({ where: { brandId: { in: brandIds } } }),
      this.prisma.product.count({
        where: { brandId: { in: brandIds }, isActive: true },
      }),
      this.prisma.transactionIntent.count({
        where: { brandId: { in: brandIds }, status: TransactionStatus.PENDING },
      }),
      this.prisma.transactionIntent.count({
        where: {
          brandId: { in: brandIds },
          status: TransactionStatus.CONTACTED,
        },
      }),
      this.prisma.transactionIntent.count({
        where: {
          brandId: { in: brandIds },
          status: TransactionStatus.CONFIRMED,
        },
      }),
      this.prisma.transactionIntent.aggregate({
        where: {
          brandId: { in: brandIds },
          status: TransactionStatus.CONFIRMED,
        },
        _sum: { finalAmount: true, commission: true },
      }),
      this.sumCommissions({
        brandIds,
        status: CommissionStatus.PENDING,
      }),
      this.sumCommissions({ brandIds, status: CommissionStatus.PAID }),
      this.prisma.transactionConfirmationProof.count({
        where: {
          status: ConfirmationProofStatus.PENDING,
          transaction: { is: { brandId: { in: brandIds } } },
        },
      }),
      this.prisma.transactionIntent.findMany({
        where: { brandId: { in: brandIds } },
        include: this.intentInclude(),
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commission.findMany({
        where: { brandId: { in: brandIds } },
        include: { brand: { select: { id: true, name: true } } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      brands,
      cards: {
        totalBrands: brands.length,
        totalProducts,
        activeProducts,
        pendingPurchaseIntents,
        contactedPurchaseIntents,
        confirmedPurchases,
        confirmedSales: confirmedSales._sum.finalAmount || 0,
        expectedCommission: confirmedSales._sum.commission || 0,
        pendingCommissionAmount: pendingCommissions,
        paidCommissionAmount: paidCommissions,
        pendingConfirmationProofs: pendingProofs,
      },
      directConfirmation: brands.map((brand) => ({
        brandId: brand.id,
        brandName: brand.name,
        verificationStatus: brand.verificationStatus,
        canDirectlyConfirmPurchases: brand.canDirectlyConfirmPurchases,
      })),
      recentPurchaseIntents,
      recentCommissions,
    };
  }

  async getAdminDashboard(adminUserId: string) {
    const [
      totalUsers,
      customers,
      brandOwners,
      totalBrands,
      verifiedBrands,
      pendingBrandVerifications,
      totalProducts,
      activeProducts,
      pendingPurchaseIntents,
      confirmedPurchases,
      confirmedVolume,
      pendingCommissions,
      paidCommissions,
      creditLiability,
      pendingWithdrawals,
      approvedWithdrawals,
      pendingProofs,
      recentPurchaseIntents,
      recentWithdrawals,
      recentBrandRequests,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'BRAND_OWNER' } }),
      this.prisma.brand.count(),
      this.prisma.brand.count({
        where: { verificationStatus: BrandStatus.VERIFIED },
      }),
      this.prisma.brand.count({
        where: { verificationStatus: BrandStatus.PENDING_VERIFICATION },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.transactionIntent.count({
        where: { status: TransactionStatus.PENDING },
      }),
      this.prisma.transactionIntent.count({
        where: { status: TransactionStatus.CONFIRMED },
      }),
      this.prisma.transactionIntent.aggregate({
        where: { status: TransactionStatus.CONFIRMED },
        _sum: { finalAmount: true },
      }),
      this.sumCommissions({ status: CommissionStatus.PENDING }),
      this.sumCommissions({ status: CommissionStatus.PAID }),
      this.sumRewardStatusTotals([
        RewardStatus.PENDING,
        RewardStatus.AVAILABLE,
        RewardStatus.WITHDRAWAL_REQUESTED,
      ]),
      this.sumWithdrawals({ status: CreditWithdrawalStatus.PENDING }),
      this.sumWithdrawals({ status: CreditWithdrawalStatus.APPROVED }),
      this.prisma.transactionConfirmationProof.count({
        where: { status: ConfirmationProofStatus.PENDING },
      }),
      this.prisma.transactionIntent.findMany({
        include: this.intentInclude(),
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditWithdrawal.findMany({
        include: { rewards: { select: { id: true } } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brand.findMany({
        where: { verificationStatus: BrandStatus.PENDING_VERIFICATION },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      adminUserId,
      cards: {
        totalUsers,
        customers,
        brandOwners,
        totalBrands,
        verifiedBrands,
        pendingBrandVerifications,
        totalProducts,
        activeProducts,
        pendingPurchaseIntents,
        confirmedPurchases,
        confirmedPurchaseVolume: confirmedVolume._sum.finalAmount || 0,
        pendingCommissionAmount: pendingCommissions,
        paidCommissionAmount: paidCommissions,
        creditLiability,
        pendingWithdrawalAmount: pendingWithdrawals,
        approvedWithdrawalAmount: approvedWithdrawals,
        pendingConfirmationProofs: pendingProofs,
      },
      queues: {
        brandVerifications: pendingBrandVerifications,
        confirmationProofs: pendingProofs,
        withdrawals: pendingWithdrawals,
        commissions: pendingCommissions,
      },
      recentPurchaseIntents,
      recentWithdrawals: recentWithdrawals.map((withdrawal) =>
        this.mapWithdrawal(withdrawal),
      ),
      recentBrandRequests,
    };
  }

  private intentInclude() {
    return {
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          canDirectlyConfirmPurchases: true,
        },
      },
      items: true,
      confirmationProofs: { orderBy: { createdAt: 'desc' } },
    } as const;
  }

  private async sumRewards(userId: string, status: RewardStatus) {
    const result = await this.prisma.reward.aggregate({
      where: { userId, status },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private async sumRewardStatusTotals(statuses: RewardStatus[]) {
    const result = await this.prisma.reward.aggregate({
      where: { status: { in: statuses } },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private async sumWithdrawals(options: {
    userId?: string;
    status: CreditWithdrawalStatus;
  }) {
    const result = await this.prisma.creditWithdrawal.aggregate({
      where: { userId: options.userId, status: options.status },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private async sumCommissions(options: {
    brandIds?: string[];
    status: CommissionStatus;
  }) {
    const result = await this.prisma.commission.aggregate({
      where: {
        brandId: options.brandIds ? { in: options.brandIds } : undefined,
        status: options.status,
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private mapWithdrawal(withdrawal: any) {
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

  private emptyBrandCards() {
    return {
      totalBrands: 0,
      totalProducts: 0,
      activeProducts: 0,
      pendingPurchaseIntents: 0,
      contactedPurchaseIntents: 0,
      confirmedPurchases: 0,
      confirmedSales: 0,
      expectedCommission: 0,
      pendingCommissionAmount: 0,
      paidCommissionAmount: 0,
      pendingConfirmationProofs: 0,
    };
  }
}
