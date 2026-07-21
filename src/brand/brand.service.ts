import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BrandStatus, NigerianRegion, UserRole } from '@prisma/client';
import { toSlug } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { BrandResponseDto, BrandStorefrontDto, BrandWithStatsDto } from './dto/brand-response.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ReviewBrandDto, UpdateBrandDto } from './dto/update-brand.dto';

type Actor = { userId: string; role: UserRole };

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto, actor: Actor): Promise<BrandResponseDto> {
    const { ownerId, ...data } = dto;
    const brand = await this.prisma.brand.create({
      data: {
        ...data,
        slug: await this.uniqueSlug(dto.name),
        ownerId: actor.role === UserRole.BRAND_OWNER ? actor.userId : ownerId,
      },
    });
    return this.map(brand);
  }

  async findPublic(options: {
    featured?: boolean;
    search?: string;
    region?: NigerianRegion;
    state?: string;
    deliveryState?: string;
    nationwideDelivery?: boolean;
    skip?: number;
    take?: number;
  } = {}): Promise<BrandResponseDto[]> {
    const brands = await this.prisma.brand.findMany({
      where: {
        verificationStatus: BrandStatus.VERIFIED,
        isFeatured: options.featured,
        name: options.search ? { contains: options.search, mode: 'insensitive' } : undefined,
        region: options.region,
        state: options.state,
        deliveryStates: options.deliveryState ? { has: options.deliveryState } : undefined,
        nationwideDelivery: options.nationwideDelivery,
      },
      skip: options.skip,
      take: options.take,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return brands.map((brand) => this.map(brand));
  }

  async findAllAdmin(status?: BrandStatus) {
    const brands = await this.prisma.brand.findMany({
      where: { verificationStatus: status },
      orderBy: { createdAt: 'desc' },
    });
    return brands.map((brand) => this.map(brand));
  }

  async findFeatured() {
    const now = new Date();
    const brands = await this.prisma.brand.findMany({
      where: {
        verificationStatus: BrandStatus.VERIFIED,
        isFeatured: true,
        OR: [{ featuredUntil: null }, { featuredUntil: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return brands.map((brand) => this.map(brand));
  }

  async findPublicById(id: string) {
    return this.findPublicUnique({ id });
  }

  async findPublicBySlug(slug: string) {
    return this.findPublicUnique({ slug });
  }

  async getStorefront(slug: string): Promise<BrandStorefrontDto> {
    const brand = await this.prisma.brand.findFirst({
      where: { slug, verificationStatus: BrandStatus.VERIFIED },
      include: {
        products: {
          where: { isActive: true },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!brand) throw new NotFoundException('Brand storefront not found');
    return { brand: this.map(brand), products: brand.products };
  }

  async findByOwner(ownerId: string) {
    const brands = await this.prisma.brand.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
    return brands.map((brand) => this.map(brand));
  }

  async update(id: string, dto: UpdateBrandDto, actor: Actor) {
    const brand = await this.requireManageable(id, actor);
    const { ownerId, ...data } = dto;
    const updateData: any = { ...data };
    if (actor.role === UserRole.ADMIN && ownerId !== undefined) updateData.ownerId = ownerId;
    if (dto.name && dto.name !== brand.name) updateData.slug = await this.uniqueSlug(dto.name, id);
    return this.map(await this.prisma.brand.update({ where: { id }, data: updateData }));
  }

  async review(id: string, dto: ReviewBrandDto) {
    await this.requireBrand(id);
    return this.map(await this.prisma.brand.update({
      where: { id },
      data: { verificationStatus: dto.status, verificationNotes: dto.notes },
    }));
  }

  async remove(id: string) {
    await this.requireBrand(id);
    await this.prisma.brand.delete({ where: { id } });
  }

  async getBrandStats(id: string, actor: Actor): Promise<BrandWithStatsDto> {
    const brand = await this.requireManageable(id, actor);
    const [products, transactions] = await Promise.all([
      this.prisma.product.count({ where: { brandId: id } }),
      this.prisma.transactionIntent.findMany({ where: { brandId: id } }),
    ]);
    const completed = transactions.filter((item) => item.status === 'COMPLETED');
    return {
      ...this.map(brand),
      productCount: products,
      transactionCount: transactions.length,
      completedTransactions: completed.length,
      pendingTransactions: transactions.filter((item) => item.status === 'PENDING').length,
      totalSales: completed.reduce((total, item) => total + (item.amount || 0), 0),
    };
  }

  async setFeatured(id: string, featuredUntil?: Date) {
    await this.requireBrand(id);
    return this.map(await this.prisma.brand.update({ where: { id }, data: { isFeatured: true, featuredUntil } }));
  }

  async removeFeatured(id: string) {
    await this.requireBrand(id);
    return this.map(await this.prisma.brand.update({ where: { id }, data: { isFeatured: false, featuredUntil: null } }));
  }

  private async findPublicUnique(where: { id?: string; slug?: string }) {
    const brand = await this.prisma.brand.findFirst({ where: { ...where, verificationStatus: BrandStatus.VERIFIED } });
    if (!brand) throw new NotFoundException('Verified brand not found');
    return this.map(brand);
  }

  private async requireBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand with ID ${id} not found`);
    return brand;
  }

  private async requireManageable(id: string, actor: Actor) {
    const brand = await this.requireBrand(id);
    if (actor.role !== UserRole.ADMIN && brand.ownerId !== actor.userId) {
      throw new ForbiddenException('You can only manage your own brand');
    }
    return brand;
  }

  private async uniqueSlug(name: string, excludedId?: string) {
    const base = toSlug(name) || 'brand';
    let slug = base;
    let suffix = 2;
    while (await this.prisma.brand.findFirst({ where: { slug, id: excludedId ? { not: excludedId } : undefined } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  private map(brand: any): BrandResponseDto {
    return {
      id: brand.id, name: brand.name, slug: brand.slug, logo: brand.logo, banner: brand.banner,
      about: brand.about, phone: brand.phone, whatsappLink: brand.whatsappLink, email: brand.email,
      websiteUrl: brand.websiteUrl, socialLinks: brand.socialLinks, verificationStatus: brand.verificationStatus,
      warrantyPolicy: brand.warrantyPolicy, returnsPolicy: brand.returnsPolicy, region: brand.region,
      state: brand.state, lga: brand.lga, deliveryStates: brand.deliveryStates,
      pickupLocations: brand.pickupLocations, inspectionLocations: brand.inspectionLocations,
      nationwideDelivery: brand.nationwideDelivery, isFeatured: brand.isFeatured,
      featuredUntil: brand.featuredUntil, createdAt: brand.createdAt, updatedAt: brand.updatedAt,
    };
  }
}
