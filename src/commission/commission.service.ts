import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionStatus, TransactionStatus } from '@prisma/client';

export interface CommissionCalculation {
  transactionAmount: number;
  commissionRate: number;
  commissionAmount: number;
  brandReceives: number;
}

@Injectable()
export class CommissionService {
  private readonly defaultCommissionRate: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.defaultCommissionRate = this.configService.get<number>(
      'DEFAULT_COMMISSION_RATE',
      5.0,
    );
  }

  calculateCommission(
    transactionAmount: number,
    commissionRate?: number,
  ): CommissionCalculation {
    const rate = commissionRate || this.defaultCommissionRate;
    const commissionAmount = (transactionAmount * rate) / 100;
    const brandReceives = transactionAmount - commissionAmount;

    return {
      transactionAmount,
      commissionRate: rate,
      commissionAmount,
      brandReceives,
    };
  }

  async createCommission(transactionId: string): Promise<any> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id: transactionId },
      include: { brand: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

    if (transaction.status !== TransactionStatus.CONFIRMED) {
      throw new Error('Commission can only be created for confirmed purchases');
    }

    const commissionRate =
      transaction.brand?.commissionRate || this.defaultCommissionRate;
    const amount = transaction.finalAmount || transaction.amount || 0;
    const commissionAmount = (amount * commissionRate) / 100;

    const commission = await this.prisma.commission.create({
      data: {
        transactionId,
        brandId: transaction.brandId,
        amount: commissionAmount,
        rate: commissionRate,
        status: CommissionStatus.PENDING,
      },
    });

    return commission;
  }

  async findAll(options?: {
    brandId?: string;
    status?: CommissionStatus;
    skip?: number;
    take?: number;
  }): Promise<any[]> {
    const where: any = {};

    if (options?.brandId) {
      where.brandId = options.brandId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const commissions = await this.prisma.commission.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return commissions;
  }

  async findOne(id: string): Promise<any> {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!commission) {
      throw new NotFoundException(`Commission with ID ${id} not found`);
    }

    return commission;
  }

  async findByBrand(brandId: string): Promise<any[]> {
    const commissions = await this.prisma.commission.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });

    return commissions;
  }

  async markAsPaid(id: string): Promise<any> {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException(`Commission with ID ${id} not found`);
    }

    const updatedCommission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: CommissionStatus.PAID,
        paidAt: new Date(),
      },
    });

    return updatedCommission;
  }

  async waiveCommission(id: string): Promise<any> {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException(`Commission with ID ${id} not found`);
    }

    const updatedCommission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: CommissionStatus.WAIVED,
      },
    });

    return updatedCommission;
  }

  async getCommissionStats(brandId?: string) {
    const where: any = {};
    if (brandId) {
      where.brandId = brandId;
    }

    const [
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      waivedCommissions,
      totalAmount,
      pendingAmount,
      paidAmount,
      waivedAmount,
    ] = await Promise.all([
      this.prisma.commission.count({ where }),
      this.prisma.commission.count({
        where: { ...where, status: CommissionStatus.PENDING },
      }),
      this.prisma.commission.count({
        where: { ...where, status: CommissionStatus.PAID },
      }),
      this.prisma.commission.count({
        where: { ...where, status: CommissionStatus.WAIVED },
      }),
      this.prisma.commission.aggregate({ where, _sum: { amount: true } }),
      this.prisma.commission.aggregate({
        where: { ...where, status: CommissionStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { ...where, status: CommissionStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { ...where, status: CommissionStatus.WAIVED },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      waivedCommissions,
      totalAmount: totalAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      paidAmount: paidAmount._sum.amount || 0,
      waivedAmount: waivedAmount._sum.amount || 0,
    };
  }

  async getBrandCommissionReport(
    brandId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = startDate;
      }
      if (endDate) {
        dateFilter.createdAt.lte = endDate;
      }
    }

    const commissions = await this.prisma.commission.findMany({
      where: {
        brandId,
        ...dateFilter,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = await this.getCommissionStats(brandId);

    return {
      brandId,
      commissions,
      stats,
    };
  }

  async processTransactionCommission(transactionId: string): Promise<any> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id: transactionId },
      include: { brand: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

    if (transaction.status !== TransactionStatus.CONFIRMED) {
      throw new Error(
        'Commission can only be processed for confirmed purchases',
      );
    }

    // Check if commission already exists
    const existingCommission = await this.prisma.commission.findUnique({
      where: { transactionId },
    });

    if (existingCommission) {
      return existingCommission;
    }

    // Create new commission
    return this.createCommission(transactionId);
  }
}
