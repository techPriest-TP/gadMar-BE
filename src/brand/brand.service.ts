import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandResponseDto, BrandWithStatsDto } from './dto/brand-response.dto';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    const brand = await this.prisma.brand.create({
      data: createBrandDto,
    });

    return this.mapToBrandResponse(brand);
  }

  async findAll(options?: {
    featured?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<BrandResponseDto[]> {
    const where: any = {};

    if (options?.featured !== undefined) {
      where.isFeatured = options.featured;
    }

    if (options?.search) {
      where.name = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    const brands = await this.prisma.brand.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return brands.map(this.mapToBrandResponse);
  }

  async findFeatured(): Promise<BrandResponseDto[]> {
    const now = new Date();
    const brands = await this.prisma.brand.findMany({
      where: {
        isFeatured: true,
        OR: [
          { featuredUntil: null },
          { featuredUntil: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return brands.map(this.mapToBrandResponse);
  }

  async findOne(id: string): Promise<BrandResponseDto> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return this.mapToBrandResponse(brand);
  }

  async findByOwner(ownerId: string): Promise<BrandResponseDto[]> {
    const brands = await this.prisma.brand.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });

    return brands.map(this.mapToBrandResponse);
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<BrandResponseDto> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });

    return this.mapToBrandResponse(updatedBrand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    await this.prisma.brand.delete({
      where: { id },
    });
  }

  async getBrandStats(id: string): Promise<BrandWithStatsDto> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    // Get transaction stats
    const transactions = await this.prisma.transactionIntent.findMany({
      where: { brandId: id },
    });

    const productCount = brand.products.length;
    const transactionCount = transactions.length;
    const completedTransactions = transactions.filter((t) => t.status === 'COMPLETED').length;
    const pendingTransactions = transactions.filter((t) => t.status === 'PENDING').length;
    const totalSales = transactions
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      ...this.mapToBrandResponse(brand),
      productCount,
      transactionCount,
      completedTransactions,
      pendingTransactions,
      totalSales,
    };
  }

  async setFeatured(id: string, featuredUntil?: Date): Promise<BrandResponseDto> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: {
        isFeatured: true,
        featuredUntil,
      },
    });

    return this.mapToBrandResponse(updatedBrand);
  }

  async removeFeatured(id: string): Promise<BrandResponseDto> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: {
        isFeatured: false,
        featuredUntil: null,
      },
    });

    return this.mapToBrandResponse(updatedBrand);
  }

  private mapToBrandResponse(brand: any): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      logo: brand.logo,
      about: brand.about,
      phone: brand.phone,
      whatsappLink: brand.whatsappLink,
      email: brand.email,
      isFeatured: brand.isFeatured,
      featuredUntil: brand.featuredUntil,
      commissionRate: brand.commissionRate,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }
}
