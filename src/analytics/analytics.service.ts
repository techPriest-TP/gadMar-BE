import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus, RewardStatus, ActivityType } from '@prisma/client';

export interface DashboardStats {
  users: {
    total: number;
    newThisMonth: number;
  };
  brands: {
    total: number;
    featured: number;
  };
  products: {
    total: number;
    active: number;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    totalSales: number;
    totalCommission: number;
  };
  rewards: {
    total: number;
    pending: number;
    claimed: number;
    totalAmount: number;
  };
  activities: {
    total: number;
    productViews: number;
    whatsappClicks: number;
  };
}

export interface MonthlyData {
  month: string;
  transactions: number;
  sales: number;
  users: number;
  rewards: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalBrands,
      featuredBrands,
      totalProducts,
      activeProducts,
      transactionStats,
      rewardStats,
      activityStats,
    ] = await Promise.all([
      // Users
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: firstDayOfMonth } },
      }),
      // Brands
      this.prisma.brand.count(),
      this.prisma.brand.count({ where: { isFeatured: true } }),
      // Products
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      // Transactions
      this.getTransactionStats(),
      // Rewards
      this.getRewardStats(),
      // Activities
      this.getActivityStats(),
    ]);

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
      },
      brands: {
        total: totalBrands,
        featured: featuredBrands,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      transactions: transactionStats,
      rewards: rewardStats,
      activities: activityStats,
    };
  }

  async getMonthlyStats(months: number = 6): Promise<MonthlyData[]> {
    const result: MonthlyData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString('default', { month: 'short', year: '2-digit' });

      const [transactionCount, sales, userCount, rewardCount] = await Promise.all([
        this.prisma.transactionIntent.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        this.prisma.transactionIntent.aggregate({
          where: {
            status: TransactionStatus.CONFIRMED,
            completedAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        this.prisma.reward.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
      ]);

      result.push({
        month: monthName,
        transactions: transactionCount,
        sales: sales._sum.amount || 0,
        users: userCount,
        rewards: rewardCount,
      });
    }

    return result;
  }

  async getTopBrands(limit: number = 5) {
    const brands = await this.prisma.brand.findMany({
      take: limit,
      include: {
        products: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    const brandStats = await Promise.all(
      brands.map(async (brand) => {
        const transactionStats = await this.prisma.transactionIntent.aggregate({
          where: { brandId: brand.id, status: TransactionStatus.CONFIRMED },
          _count: true,
          _sum: { amount: true },
        });

        return {
          id: brand.id,
          name: brand.name,
          logo: brand.logo,
          productCount: brand._count.products,
          transactionCount: transactionStats._count,
          totalSales: transactionStats._sum.amount || 0,
        };
      }),
    );

    return brandStats.sort((a, b) => b.totalSales - a.totalSales);
  }

  async getTopProducts(limit: number = 5) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      take: limit,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const productStats = await Promise.all(
      products.map(async (product) => {
        const transactionStats = await this.prisma.transactionIntent.aggregate({
          where: { productId: product.id, status: TransactionStatus.CONFIRMED },
          _count: true,
          _sum: { amount: true },
        });

        const viewStats = await this.prisma.activityLog.count({
          where: { productId: product.id, type: ActivityType.PRODUCT_VIEW },
        });

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          images: product.images,
          brand: product.brand,
          views: viewStats,
          transactionCount: transactionStats._count,
          totalSales: transactionStats._sum.amount || 0,
        };
      }),
    );

    return productStats.sort((a, b) => b.totalSales - a.totalSales);
  }

  async getTopUsers(limit: number = 5) {
    const users = await this.prisma.user.findMany({
      take: limit,
    });

    const userStats = await Promise.all(
      users.map(async (user) => {
        const [transactionStats, rewardStats] = await Promise.all([
          this.prisma.transactionIntent.aggregate({
            where: { userId: user.id, status: TransactionStatus.CONFIRMED },
            _count: true,
            _sum: { amount: true },
          }),
          this.prisma.reward.aggregate({
            where: { userId: user.id },
            _count: true,
            _sum: { amount: true },
          }),
        ]);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          transactionCount: transactionStats._count,
          totalSpent: transactionStats._sum.amount || 0,
          rewardCount: rewardStats._count,
          totalRewards: rewardStats._sum.amount || 0,
        };
      }),
    );

    return userStats.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  async getCommissionReport(startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.completedAt = {};
      if (startDate) {
        dateFilter.completedAt.gte = startDate;
      }
      if (endDate) {
        dateFilter.completedAt.lte = endDate;
      }
    }

    const commissions = await this.prisma.transactionIntent.groupBy({
      by: ['brandId'],
      where: {
        status: TransactionStatus.CONFIRMED,
        ...dateFilter,
      },
      _sum: {
        amount: true,
        commission: true,
      },
      _count: true,
    });

    const result = await Promise.all(
      commissions.map(async (comm) => {
        const brand = await this.prisma.brand.findUnique({
          where: { id: comm.brandId },
          select: { id: true, name: true, commissionRate: true },
        });

        return {
          brandId: comm.brandId,
          brandName: brand?.name || 'Unknown',
          commissionRate: brand?.commissionRate || 5.0,
          transactionCount: comm._count,
          totalSales: comm._sum.amount || 0,
          totalCommission: comm._sum.commission || 0,
        };
      }),
    );

    return result.sort((a, b) => b.totalCommission - a.totalCommission);
  }

  private async getTransactionStats() {
    const [total, pending, completed, cancelled, sales] = await Promise.all([
      this.prisma.transactionIntent.count(),
      this.prisma.transactionIntent.count({ where: { status: TransactionStatus.PENDING } }),
      this.prisma.transactionIntent.count({ where: { status: TransactionStatus.CONFIRMED } }),
      this.prisma.transactionIntent.count({ where: { status: TransactionStatus.CANCELLED } }),
      this.prisma.transactionIntent.aggregate({
        where: { status: TransactionStatus.CONFIRMED },
        _sum: { amount: true, commission: true },
      }),
    ]);

    return {
      total,
      pending,
      completed,
      cancelled,
      totalSales: sales._sum.amount || 0,
      totalCommission: sales._sum.commission || 0,
    };
  }

  private async getRewardStats() {
    const [total, pending, claimed, amount] = await Promise.all([
      this.prisma.reward.count(),
      this.prisma.reward.count({ where: { status: RewardStatus.PENDING } }),
      this.prisma.reward.count({ where: { status: RewardStatus.CLAIMED } }),
      this.prisma.reward.aggregate({
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      pending,
      claimed,
      totalAmount: amount._sum.amount || 0,
    };
  }

  private async getActivityStats() {
    const [total, productViews, whatsappClicks] = await Promise.all([
      this.prisma.activityLog.count(),
      this.prisma.activityLog.count({ where: { type: ActivityType.PRODUCT_VIEW } }),
      this.prisma.activityLog.count({ where: { type: ActivityType.WHATSAPP_CLICK } }),
    ]);

    return {
      total,
      productViews,
      whatsappClicks,
    };
  }
}
