import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  ConfirmationProofStatus,
  CommissionStatus,
  TransactionConfirmationSource,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateTransactionIntentDto } from './dto/create-transaction-intent.dto';
import { UpdateTransactionIntentDto } from './dto/update-transaction-intent.dto';
import { RewardService } from '../reward/reward.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import {
  ConfirmTransactionIntentDto,
  GenerateConfirmationLinkDto,
  RejectConfirmationProofDto,
  ReviewConfirmationProofDto,
  SubmitConfirmationProofDto,
} from './dto/confirmation-flow.dto';

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
    private readonly cloudinary: CloudinaryService,
    private readonly configService: ConfigService,
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
      include: {
        brand: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
      },
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
                productImage: p.images[0]
                  ? this.cloudinary.productImageUrl(
                      p.images[0].publicId,
                      'card',
                    )
                  : undefined,
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
        await this.rewardService.issuePurchaseCreditsForConfirmedIntent(id);
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

    if (dto.status === TransactionStatus.CONFIRMED) {
      await this.confirmIntent(
        id,
        dto.finalAmount!,
        TransactionConfirmationSource.LEGACY_STATUS_UPDATE,
        actor,
      );
    } else {
      await this.prisma.transactionIntent.update({
        where: { id },
        data: { status: dto.status },
      });
    }
    return this.findOneWithDetails(id, actor);
  }

  async confirmDirect(
    id: string,
    dto: ConfirmTransactionIntentDto,
    actor: Actor,
  ) {
    const source =
      actor.role === UserRole.ADMIN
        ? TransactionConfirmationSource.ADMIN_DIRECT
        : TransactionConfirmationSource.BRAND_DIRECT;

    return this.confirmIntent(id, dto.finalAmount, source, actor, dto.note);
  }

  async generateConfirmationLink(
    id: string,
    dto: GenerateConfirmationLinkDto,
    actor: Actor,
  ) {
    const intent = await this.findOneWithDetails(id, actor);
    if (intent.status === TransactionStatus.CONFIRMED) {
      throw new BadRequestException('Purchase intent is already confirmed');
    }

    const token = await this.generateUniqueConfirmationToken();
    const expiresAt = new Date(
      Date.now() + (dto.expiresInHours ?? 72) * 60 * 60 * 1000,
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const confirmationLink = `${frontendUrl.replace(/\/$/, '')}/dashboard/purchases/${intent.refCode}/confirm?token=${token}`;

    await this.prisma.transactionIntent.update({
      where: { id },
      data: {
        confirmationLinkToken: token,
        confirmationLinkFinalAmount: dto.finalAmount,
        confirmationLinkGeneratedById: actor.userId,
        confirmationLinkGeneratedAt: new Date(),
        confirmationLinkExpiresAt: expiresAt,
        confirmationNote: dto.note,
      },
    });

    return {
      transactionId: id,
      refCode: intent.refCode,
      confirmationLink,
      finalAmount: dto.finalAmount,
      expiresAt,
    };
  }

  async submitConfirmationProof(
    id: string,
    dto: SubmitConfirmationProofDto,
    userId: string,
  ) {
    const intent = await this.prisma.transactionIntent.findUnique({
      where: { id },
      include: this.intentInclude(),
    });
    if (!intent) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    if (!intent.userId || intent.userId !== userId) {
      throw new ForbiddenException(
        'You can only submit proof for your own purchase intent',
      );
    }
    if (intent.status === TransactionStatus.CONFIRMED) {
      throw new BadRequestException('Purchase intent is already confirmed');
    }

    const token = this.extractConfirmationToken(dto.confirmationLink);
    if (!token || token !== intent.confirmationLinkToken) {
      throw new BadRequestException('Confirmation link is invalid');
    }
    if (
      !intent.confirmationLinkExpiresAt ||
      intent.confirmationLinkExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Confirmation link has expired');
    }
    if (!intent.confirmationLinkFinalAmount) {
      throw new BadRequestException(
        'Confirmation link does not include a final purchase amount',
      );
    }

    const existingPending =
      await this.prisma.transactionConfirmationProof.findFirst({
        where: {
          transactionId: id,
          userId,
          status: ConfirmationProofStatus.PENDING,
        },
      });
    if (existingPending) return existingPending;

    return this.prisma.transactionConfirmationProof.create({
      data: {
        transactionId: id,
        userId,
        confirmationLink: dto.confirmationLink,
        finalAmount: intent.confirmationLinkFinalAmount,
        note: dto.note,
      },
    });
  }

  async findConfirmationProofs(options?: {
    status?: ConfirmationProofStatus;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.transactionConfirmationProof.findMany({
      where: { status: options?.status },
      include: {
        transaction: { include: this.intentInclude() },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveConfirmationProof(
    proofId: string,
    dto: ReviewConfirmationProofDto,
    actor: Actor,
  ) {
    const proof = await this.prisma.transactionConfirmationProof.findUnique({
      where: { id: proofId },
    });
    if (!proof) {
      throw new NotFoundException(`Confirmation proof ${proofId} not found`);
    }
    if (proof.status !== ConfirmationProofStatus.PENDING) {
      throw new BadRequestException(
        'Confirmation proof has already been reviewed',
      );
    }

    await this.confirmIntent(
      proof.transactionId,
      proof.finalAmount,
      TransactionConfirmationSource.CUSTOMER_PROOF,
      actor,
      dto.note,
    );

    return this.prisma.transactionConfirmationProof.update({
      where: { id: proofId },
      data: {
        status: ConfirmationProofStatus.APPROVED,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
        reviewNote: dto.note,
      },
      include: {
        transaction: { include: this.intentInclude() },
      },
    });
  }

  async rejectConfirmationProof(
    proofId: string,
    dto: RejectConfirmationProofDto,
    actor: Actor,
  ) {
    const proof = await this.prisma.transactionConfirmationProof.findUnique({
      where: { id: proofId },
    });
    if (!proof) {
      throw new NotFoundException(`Confirmation proof ${proofId} not found`);
    }
    if (proof.status !== ConfirmationProofStatus.PENDING) {
      throw new BadRequestException(
        'Confirmation proof has already been reviewed',
      );
    }

    return this.prisma.transactionConfirmationProof.update({
      where: { id: proofId },
      data: {
        status: ConfirmationProofStatus.REJECTED,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
        rejectionReason: dto.reason,
      },
      include: {
        transaction: { include: this.intentInclude() },
      },
    });
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
      confirmationProofs: { orderBy: { createdAt: 'desc' } },
    } as const;
  }
  private batchInclude() {
    return { intents: { include: this.intentInclude() } } as const;
  }
  private reference(prefix: string) {
    return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async confirmIntent(
    id: string,
    finalAmount: number,
    source: TransactionConfirmationSource,
    actor?: Actor,
    note?: string,
  ) {
    const intent = await this.findOneWithDetails(id, actor);
    if (intent.status === TransactionStatus.CONFIRMED) {
      return intent;
    }
    if (
      !(
        [
          TransactionStatus.PENDING,
          TransactionStatus.CONTACTED,
          TransactionStatus.NEGOTIATING,
        ] as TransactionStatus[]
      ).includes(intent.status)
    ) {
      throw new BadRequestException(
        `Cannot confirm purchase intent from ${intent.status}`,
      );
    }

    const rate = intent.brand.commissionRate ?? 5;
    const commissionAmount = (finalAmount * rate) / 100;
    await this.prisma.$transaction(async (tx) => {
      await tx.transactionIntent.update({
        where: { id },
        data: {
          status: TransactionStatus.CONFIRMED,
          finalAmount,
          commission: commissionAmount,
          completedAt: new Date(),
          confirmationSource: source,
          confirmedById: actor?.userId,
          confirmationNote: note,
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
            finalAmount,
            commission: commissionAmount,
            confirmationSource: source,
            confirmedById: actor?.userId,
          },
        },
      });
    });

    if (intent.userId && intent.items.some((item) => item.rewardEligible)) {
      await this.rewardService.issuePurchaseCreditsForConfirmedIntent(id);
    }
    return this.findOneWithDetails(id, actor);
  }

  private extractConfirmationToken(confirmationLink: string) {
    try {
      return new URL(confirmationLink).searchParams.get('token');
    } catch {
      const match = confirmationLink.match(/[?&]token=([^&]+)/);
      return match?.[1] ? decodeURIComponent(match[1]) : undefined;
    }
  }

  private async generateUniqueConfirmationToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(24).toString('hex');
      const existing = await this.prisma.transactionIntent.findFirst({
        where: { confirmationLinkToken: token },
        select: { id: true },
      });
      if (!existing) return token;
    }
    throw new BadRequestException('Could not generate confirmation link token');
  }

  private async assertBrandAccess(brandId: string, actor?: Actor) {
    if (!actor || actor.role !== UserRole.BRAND_OWNER) return;
    const owned = await this.prisma.brand.count({
      where: { id: brandId, ownerId: actor.userId },
    });
    if (!owned) throw new ForbiddenException('You do not own this brand');
  }
}
