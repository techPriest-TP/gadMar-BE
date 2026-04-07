import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionIntentDto } from './dto/create-transaction-intent.dto';
import { UpdateTransactionIntentDto } from './dto/update-transaction-intent.dto';
import {
  TransactionIntentResponseDto,
  TransactionIntentWithDetailsDto,
} from './dto/transaction-intent-response.dto';
import { TransactionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionIntentService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(
    userId: string,
    createDto: CreateTransactionIntentDto,
  ): Promise<TransactionIntentWithDetailsDto> {
    const { productId, brandId, amount } = createDto;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Verify brand exists
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${brandId} not found`);
    }

    // Generate unique reference code
    const refCode = this.generateRefCode();

    // Create transaction intent
    const transaction = await this.prisma.transactionIntent.create({
      data: {
        userId,
        productId,
        brandId,
        status: TransactionStatus.PENDING,
        refCode,
        amount: amount || product.price,
      },
    });

    // Generate WhatsApp URL
    const whatsappUrl = this.generateWhatsAppUrl(brand.whatsappLink, product, refCode);

    return {
      ...this.mapToTransactionResponse(transaction),
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images,
      },
      brand: {
        id: brand.id,
        name: brand.name,
        whatsappLink: brand.whatsappLink,
      },
      whatsappUrl,
    };
  }

  async findAll(options?: {
    userId?: string;
    brandId?: string;
    status?: TransactionStatus;
    skip?: number;
    take?: number;
  }): Promise<TransactionIntentResponseDto[]> {
    const where: any = {};

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.brandId) {
      where.brandId = options.brandId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const transactions = await this.prisma.transactionIntent.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(this.mapToTransactionResponse);
  }

  async findAllWithDetails(options?: {
    userId?: string;
    brandId?: string;
    status?: TransactionStatus;
    skip?: number;
    take?: number;
  }): Promise<TransactionIntentWithDetailsDto[]> {
    const where: any = {};

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.brandId) {
      where.brandId = options.brandId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    const transactions = await this.prisma.transactionIntent.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            whatsappLink: true,
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((t) => ({
      ...this.mapToTransactionResponse(t),
      product: t.product,
      brand: t.brand,
      whatsappUrl: this.generateWhatsAppUrl(t.brand.whatsappLink, t.product, t.refCode),
    }));
  }

  async findOne(id: string): Promise<TransactionIntentResponseDto> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return this.mapToTransactionResponse(transaction);
  }

  async findOneWithDetails(id: string): Promise<TransactionIntentWithDetailsDto> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            whatsappLink: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return {
      ...this.mapToTransactionResponse(transaction),
      product: transaction.product,
      brand: transaction.brand,
      whatsappUrl: this.generateWhatsAppUrl(
        transaction.brand.whatsappLink,
        transaction.product,
        transaction.refCode,
      ),
    };
  }

  async findByRefCode(refCode: string): Promise<TransactionIntentWithDetailsDto> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { refCode },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            whatsappLink: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with refCode ${refCode} not found`);
    }

    return {
      ...this.mapToTransactionResponse(transaction),
      product: transaction.product,
      brand: transaction.brand,
      whatsappUrl: this.generateWhatsAppUrl(
        transaction.brand.whatsappLink,
        transaction.product,
        transaction.refCode,
      ),
    };
  }

  async findByUser(userId: string): Promise<TransactionIntentResponseDto[]> {
    const transactions = await this.prisma.transactionIntent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(this.mapToTransactionResponse);
  }

  async findByBrand(brandId: string): Promise<TransactionIntentResponseDto[]> {
    const transactions = await this.prisma.transactionIntent.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(this.mapToTransactionResponse);
  }

  async update(
    id: string,
    updateDto: UpdateTransactionIntentDto,
  ): Promise<TransactionIntentResponseDto> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    const data: any = { ...updateDto };

    // Set completedAt if status is being changed to COMPLETED
    if (updateDto.status === TransactionStatus.COMPLETED && transaction.status !== TransactionStatus.COMPLETED) {
      data.completedAt = new Date();
    }

    const updatedTransaction = await this.prisma.transactionIntent.update({
      where: { id },
      data,
    });

    return this.mapToTransactionResponse(updatedTransaction);
  }

  async completeTransaction(id: string, amount?: number): Promise<TransactionIntentResponseDto> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    const finalAmount = amount || transaction.amount || 0;
    const commissionRate = transaction.brand?.commissionRate || 5.0;
    const commission = (finalAmount * commissionRate) / 100;

    const updatedTransaction = await this.prisma.transactionIntent.update({
      where: { id },
      data: {
        status: TransactionStatus.COMPLETED,
        amount: finalAmount,
        commission,
        completedAt: new Date(),
      },
    });

    return this.mapToTransactionResponse(updatedTransaction);
  }

  async cancelTransaction(id: string): Promise<TransactionIntentResponseDto> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    const updatedTransaction = await this.prisma.transactionIntent.update({
      where: { id },
      data: {
        status: TransactionStatus.CANCELLED,
      },
    });

    return this.mapToTransactionResponse(updatedTransaction);
  }

  async remove(id: string): Promise<void> {
    const transaction = await this.prisma.transactionIntent.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    await this.prisma.transactionIntent.delete({
      where: { id },
    });
  }

  async getStats() {
    const [
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      cancelledTransactions,
      totalSales,
    ] = await Promise.all([
      this.prisma.transactionIntent.count(),
      this.prisma.transactionIntent.count({ where: { status: TransactionStatus.PENDING } }),
      this.prisma.transactionIntent.count({ where: { status: TransactionStatus.COMPLETED } }),
      this.prisma.transactionIntent.count({ where: { status: TransactionStatus.CANCELLED } }),
      this.prisma.transactionIntent.aggregate({
        where: { status: TransactionStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      cancelledTransactions,
      totalSales: totalSales._sum.amount || 0,
    };
  }

  private generateRefCode(): string {
    const prefix = 'TXN';
    const uuid = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
    return `${prefix}-${uuid}`;
  }

  private generateWhatsAppUrl(whatsappLink: string, product: any, refCode: string): string {
    const baseUrl = whatsappLink.startsWith('http') ? whatsappLink : `https://wa.me/${whatsappLink}`;
    const message = `Hi, I'm interested in the ${product.name} (₦${product.price.toLocaleString()}). RefCode: ${refCode}`;
    const encodedMessage = encodeURIComponent(message);
    
    // Extract phone number from whatsappLink if it's a wa.me URL
    let phoneNumber = whatsappLink;
    if (whatsappLink.includes('wa.me/')) {
      phoneNumber = whatsappLink.split('wa.me/')[1].split('?')[0];
    }
    
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  }

  private mapToTransactionResponse(transaction: any): TransactionIntentResponseDto {
    return {
      id: transaction.id,
      userId: transaction.userId,
      productId: transaction.productId,
      brandId: transaction.brandId,
      status: transaction.status,
      refCode: transaction.refCode,
      amount: transaction.amount,
      commission: transaction.commission,
      completedAt: transaction.completedAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
