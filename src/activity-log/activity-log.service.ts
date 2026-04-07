import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { ActivityLogResponseDto, ActivityStatsDto } from './dto/activity-log-response.dto';
import { ActivityType } from '@prisma/client';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateActivityLogDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ActivityLogResponseDto> {
    const activity = await this.prisma.activityLog.create({
      data: {
        ...createDto,
        ipAddress,
        userAgent,
      },
    });

    return this.mapToActivityResponse(activity);
  }

  async logActivity(
    type: ActivityType,
    data: {
      userId?: string;
      productId?: string;
      brandId?: string;
      message?: string;
      metadata?: Record<string, any>;
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ActivityLogResponseDto> {
    const activity = await this.prisma.activityLog.create({
      data: {
        type,
        ...data,
        ipAddress,
        userAgent,
      },
    });

    return this.mapToActivityResponse(activity);
  }

  async findAll(options?: {
    userId?: string;
    productId?: string;
    brandId?: string;
    type?: ActivityType;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }): Promise<ActivityLogResponseDto[]> {
    const where: any = {};

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.productId) {
      where.productId = options.productId;
    }

    if (options?.brandId) {
      where.brandId = options.brandId;
    }

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const activities = await this.prisma.activityLog.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return activities.map(this.mapToActivityResponse);
  }

  async getStats(startDate?: Date, endDate?: Date): Promise<ActivityStatsDto> {
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

    const [
      totalActivities,
      productViews,
      whatsappClicks,
      brandViews,
      searches,
      uniqueUsers,
    ] = await Promise.all([
      this.prisma.activityLog.count({ where: dateFilter }),
      this.prisma.activityLog.count({
        where: { ...dateFilter, type: ActivityType.PRODUCT_VIEW },
      }),
      this.prisma.activityLog.count({
        where: { ...dateFilter, type: ActivityType.WHATSAPP_CLICK },
      }),
      this.prisma.activityLog.count({
        where: { ...dateFilter, type: ActivityType.BRAND_VIEW },
      }),
      this.prisma.activityLog.count({
        where: { ...dateFilter, type: ActivityType.SEARCH },
      }),
      this.prisma.activityLog
        .groupBy({
          by: ['userId'],
          where: { ...dateFilter, userId: { not: null } },
        })
        .then((result) => result.length),
    ]);

    return {
      totalActivities,
      productViews,
      whatsappClicks,
      brandViews,
      searches,
      uniqueUsers,
    };
  }

  async getProductViewStats(productId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const views = await this.prisma.activityLog.count({
      where: {
        productId,
        type: ActivityType.PRODUCT_VIEW,
        createdAt: {
          gte: startDate,
        },
      },
    });

    const whatsappClicks = await this.prisma.activityLog.count({
      where: {
        productId,
        type: ActivityType.WHATSAPP_CLICK,
        createdAt: {
          gte: startDate,
        },
      },
    });

    return {
      productId,
      views,
      whatsappClicks,
      conversionRate: views > 0 ? (whatsappClicks / views) * 100 : 0,
    };
  }

  async getBrandActivityStats(brandId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [views, whatsappClicks, productViews] = await Promise.all([
      this.prisma.activityLog.count({
        where: {
          brandId,
          type: ActivityType.BRAND_VIEW,
          createdAt: {
            gte: startDate,
          },
        },
      }),
      this.prisma.activityLog.count({
        where: {
          brandId,
          type: ActivityType.WHATSAPP_CLICK,
          createdAt: {
            gte: startDate,
          },
        },
      }),
      this.prisma.activityLog.count({
        where: {
          brandId,
          type: ActivityType.PRODUCT_VIEW,
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ]);

    return {
      brandId,
      views,
      whatsappClicks,
      productViews,
    };
  }

  async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  private mapToActivityResponse(activity: any): ActivityLogResponseDto {
    return {
      id: activity.id,
      type: activity.type,
      userId: activity.userId,
      productId: activity.productId,
      brandId: activity.brandId,
      metadata: activity.metadata,
      message: activity.message,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      createdAt: activity.createdAt,
    };
  }
}
