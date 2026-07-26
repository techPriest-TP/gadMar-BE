import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  CommissionStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateTransactionIntentDto } from './dto/create-transaction-intent.dto';
import { UpdateTransactionIntentDto } from './dto/update-transaction-intent.dto';
import { RewardService } from '../reward/reward.service';

type Actor = { userId: string; role: UserRole | string };

const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.PENDING]: [
    TransactionStatus.CONTACTED,
    TransactionStatus.CANCELLED,
    TransactionStatus.EXPIRED,
  ],
  [TransactionStatus.CONTACTED]: [
    TransactionStatus.NEGOTIATING,
    TransactionStatus.CONFIRMED,
    TransactionStatus.CANCELLED,
    TransactionStatus.EXPIRED,
  ],
  [TransactionStatus.NEGOTIATING]: [
    TransactionStatus.CONFIRMED,
    TransactionStatus.CANCELLED,
    TransactionStatus.EXPIRED,
  ],
  [TransactionStatus.CONFIRMED]: [],
  [TransactionStatus.CANCELLED]: [],
  [TransactionStatus.EXPIRED]: [],
};

@Injectable()
export class TransactionIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly activityLog: ActivityLogService,
    private readonly rewardService: RewardService,
  ) {}

  async create(userId: string | undefined, dto: CreateTransactionIntentDto) {
    if (!dto.items?.length)
      throw new BadRequestException('At least one cart item is required');
    if (!userId && (!dto.guestName || !dto.guestPhone)) {
      throw new BadRequestException(
        'guestName and guestPhone are required for guest checkout',
      );
    }
    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      if (
        !item?.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        throw new BadRequestException(
          'Each item requires a productId and quantity of at least 1',
        );
      }
      quantities.set(
        item.productId,
        (quantities.get(item.productId) || 0) + item.quantity,
      );
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] }, isActive: true },
      include: { brand: true },
    });
    if (products.length !== quantities.size)
      throw new NotFoundException(
        'One or more products were not found or are inactive',
      );

    const byBrand = new Map<string, typeof products>();
    for (const product of products)
      byBrand.set(product.brandId, [
        ...(byBrand.get(product.brandId) || []),
        product,
      ]);
    const batchCode = this.reference('BATCH');
    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseBatch.create({
        data: {
          batchCode,
          userId,
          guestName: userId ? undefined : dto.guestName,
          guestPhone: userId ? undefined : dto.guestPhone,
          guestEmail: userId ? undefined : dto.guestEmail,
        },
      });
      for (const [brandId, brandProducts] of byBrand) {
        const refCode = this.reference('GAD');
        const brand = brandProducts[0].brand;
        const messageItems = brandProducts.map((p) => ({
          productName: p.name,
          unitPrice: p.price,
          quantity: quantities.get(p.id)!,
        }));
        const whatsappMessage = this.whatsapp.generatePreFilledMessage({
          brandName: brand.name,
          refCode,
          items: messageItems,
        });
        const whatsappUrl = this.whatsapp.generateWhatsAppUrl({
          phoneNumber: brand.whatsappLink || brand.phone,
          brandName: brand.name,
          refCode,
          items: messageItems,
        });
        const amount = messageItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );
        await tx.transactionIntent.create({
          data: {
            batchId: created.id,
            userId,
            brandId,
            productId: brandProducts[0].id,
            refCode,
            amount,
            status: TransactionStatus.PENDING,
            whatsappMessage,
            whatsappUrl,
            items: {
              create: brandProducts.map((p) => ({
                productId: p.id,
                productName: p.name,
                productSlug: p.slug,
                productImage: p.images[0],
                unitPrice: p.price,
                quantity: quantities.get(p.id)!,
                rewardEligible: p.rewardEligible,
                brandId,
                brandName: brand.name,
              })),
            },
          },
        });
      }
      return tx.purchaseBatch.findUniqueOrThrow({
        where: { id: created.id },
        include: this.batchInclude(),
      });
    });
    await Promise.all(
      batch.intents.map((intent) =>
        this.activityLog.logActivity(ActivityType.TRANSACTION_INITIATED, {
          userId,
          brandId: intent.brandId,
          productId: intent.productId || undefined,
          metadata: {
            batchId: batch.id,
            refCode: intent.refCode,
            itemCount: intent.items.length,
          },
        }),
      ),
    );
    return batch;
  }

  async findAllWithDetails(
    options: {
      userId?: string;
      brandId?: string;
      status?: TransactionStatus;
      skip?: number;
      take?: number;
    },
    actor?: Actor,
  ) {
    const where: any = {
      userId: options.userId,
      brandId: options.brandId,
      status: options.status,
    };
    if (actor?.role === UserRole.BRAND_OWNER) {
      const actorId = actor!.userId;
      const brands = await this.prisma.brand.findMany({
        where: { ownerId: actorId },
        select: { id: true },
      });
      const ids = brands.map((b) => b.id);
      if (options.brandId && !ids.includes(options.brandId))
        throw new ForbiddenException('You do not own this brand');
      where.brandId = options.brandId || { in: ids };
    }
    Object.keys(where).forEach(
      (key) => where[key] === undefined && delete where[key],
    );
    return this.prisma.transactionIntent.findMany({
      where,
      include: this.intentInclude(),
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.purchaseBatch.findMany({
      where: { userId },
      include: this.batchInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneWithDetails(id: string, actor?: Actor) {
    const intent = await this.prisma.transactionIntent.findUnique({
      where: { id },
      include: this.intentInclude(),
    });
    if (!intent)
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    await this.assertBrandAccess(intent.brandId, actor);
    return intent;
  }

  async findByRefCode(refCode: string, actor?: Actor) {
    const intent = await this.prisma.transactionIntent.findUnique({
      where: { refCode },
      include: this.intentInclude(),
    });
    if (!intent)
      throw new NotFoundException(
        `Transaction with reference ${refCode} not found`,
      );
    await this.assertBrandAccess(intent.brandId, actor);
    return intent;
  }

  async trackWhatsApp(refCode: string, userId?: string) {
    const intent = await this.prisma.transactionIntent.findUnique({
      where: { refCode },
    });
    if (!intent)
      throw new NotFoundException(
        `Transaction with reference ${refCode} not found`,
      );
    const updated = await this.prisma.transactionIntent.update({
      where: { id: intent.id },
      data: {
        contactedAt: intent.contactedAt || new Date(),
        status:
          intent.status === TransactionStatus.PENDING
            ? TransactionStatus.CONTACTED
            : intent.status,
      },
    });
    await this.activityLog.logActivity(ActivityType.WHATSAPP_CLICK, {
      userId: userId || intent.userId || undefined,
      brandId: intent.brandId,
      productId: intent.productId || undefined,
      metadata: { batchId: intent.batchId, refCode },
    });
    return { whatsappUrl: updated.whatsappUrl };
  }

  async update(id: string, dto: UpdateTransactionIntentDto, actor?: Actor) {
    const intent = await this.findOneWithDetails(id, actor);
    if (!dto.status) throw new BadRequestException('status is required');
    if (dto.status === intent.status) {
      if (
        intent.status === TransactionStatus.CONFIRMED &&
        intent.userId &&
        intent.items.some((item) => item.rewardEligible)
      ) {
        await this.rewardService.checkAndIssueStreakReward(intent.userId);
      }
      return intent;
    }
    if (!ALLOWED_TRANSITIONS[intent.status].includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition purchase intent from ${intent.status} to ${dto.status}`,
      );
    }
    if (
      dto.status !== TransactionStatus.CONFIRMED &&
      dto.finalAmount !== undefined
    ) {
      throw new BadRequestException(
        'finalAmount can only be provided when confirming a purchase',
      );
    }
    if (
      dto.status === TransactionStatus.CONFIRMED &&
      (!dto.finalAmount || dto.finalAmount <= 0)
    ) {
      throw new BadRequestException(
        'A positive finalAmount is required to confirm a purchase',
      );
    }

    let commissionAmount: number | undefined;
    await this.prisma.$transaction(async (tx) => {
      if (dto.status === TransactionStatus.CONFIRMED) {
        const rate = intent.brand.commissionRate ?? 5;
        commissionAmount = (dto.finalAmount! * rate) / 100;
        await tx.transactionIntent.update({
          where: { id },
          data: {
            status: dto.status,
            finalAmount: dto.finalAmount,
            commission: commissionAmount,
            completedAt: new Date(),
          },
        });
        await tx.commission.upsert({
          where: { transactionId: id },
          create: {
            transactionId: id,
            brandId: intent.brandId,
            amount: commissionAmount,
            rate,
            status: CommissionStatus.PENDING,
          },
          update: {},
        });
        await tx.activityLog.create({
          data: {
            type: ActivityType.TRANSACTION_COMPLETED,
            userId: intent.userId || undefined,
            brandId: intent.brandId,
            productId: intent.productId || undefined,
            metadata: {
              batchId: intent.batchId,
              refCode: intent.refCode,
              finalAmount: dto.finalAmount,
              commission: commissionAmount,
            },
          },
        });
      } else {
        await tx.transactionIntent.update({
          where: { id },
          data: { status: dto.status },
        });
      }
    });

    if (dto.status === TransactionStatus.CONFIRMED) {
      if (intent.userId && intent.items.some((item) => item.rewardEligible)) {
        await this.rewardService.checkAndIssueStreakReward(intent.userId);
      }
    }
    return this.findOneWithDetails(id, actor);
  }

  async remove(id: string) {
    await this.findOneWithDetails(id);
    await this.prisma.transactionIntent.delete({ where: { id } });
  }

  async getStats() {
    const [total, pending, contacted, confirmed, sales] = await Promise.all([
      this.prisma.transactionIntent.count(),
      this.prisma.transactionIntent.count({
        where: { status: TransactionStatus.PENDING },
      }),
      this.prisma.transactionIntent.count({
        where: { status: TransactionStatus.CONTACTED },
      }),
      this.prisma.transactionIntent.count({
        where: { status: TransactionStatus.CONFIRMED },
      }),
      this.prisma.transactionIntent.aggregate({
        where: { status: TransactionStatus.CONFIRMED },
        _sum: { finalAmount: true },
      }),
    ]);
    return {
      total,
      pending,
      contacted,
      confirmed,
      totalSales: sales._sum.finalAmount || 0,
    };
  }

  private intentInclude() {
    return {
      items: true,
      brand: {
        select: {
          id: true,
          name: true,
          whatsappLink: true,
          commissionRate: true,
        },
      },
    } as const;
  }
  private batchInclude() {
    return { intents: { include: this.intentInclude() } } as const;
  }
  private reference(prefix: string) {
    return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
  private async assertBrandAccess(brandId: string, actor?: Actor) {
    if (!actor || actor.role !== UserRole.BRAND_OWNER) return;
    const owned = await this.prisma.brand.count({
      where: { id: brandId, ownerId: actor.userId },
    });
    if (!owned) throw new ForbiddenException('You do not own this brand');
  }
}
