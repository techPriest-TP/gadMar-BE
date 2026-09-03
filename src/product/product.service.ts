import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BrandStatus,
  NigerianRegion,
  ProductCondition,
  StockStatus,
  UserRole,
} from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { toSlug } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  ProductImageInputDto,
} from './dto/create-product.dto';
import {
  ProductResponseDto,
  ProductWithBrandDto,
} from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type Actor = { userId: string; role: UserRole };
type ProductFilters = {
  brandId?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition;
  stockStatus?: StockStatus;
  rewardEligible?: boolean;
  region?: NigerianRegion;
  state?: string;
  deliveryState?: string;
  nationwideDelivery?: boolean;
  pickupAvailable?: boolean;
  inspectionAvailable?: boolean;
  featured?: boolean;
  skip?: number;
  take?: number;
};

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(
    dto: CreateProductDto,
    actor: Actor,
  ): Promise<ProductResponseDto> {
    await this.requireBrandAccess(dto.brandId, actor);
    const { images, ...productData } = dto;
    const data: any = {
      ...productData,
      slug: await this.uniqueSlug(dto.name),
      deliveryStates: dto.deliveryStates || [],
      images: { create: this.imageCreateData(images, dto.brandId) },
    };
    if (actor.role !== UserRole.ADMIN) {
      delete data.rewardEligible;
      delete data.isFeatured;
    }
    return this.map(
      await this.prisma.product.create({
        data,
        include: { images: { orderBy: { position: 'asc' } } },
      }),
    );
  }

  async findPublic(
    filters: ProductFilters = {},
  ): Promise<ProductWithBrandDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: filters.featured,
        brandId: filters.brandId,
        brand: { verificationStatus: BrandStatus.VERIFIED },
        category: filters.category,
        name: filters.search
          ? { contains: filters.search, mode: 'insensitive' }
          : undefined,
        price:
          filters.minPrice !== undefined || filters.maxPrice !== undefined
            ? { gte: filters.minPrice, lte: filters.maxPrice }
            : undefined,
        condition: filters.condition,
        stockStatus: filters.stockStatus,
        rewardEligible: filters.rewardEligible,
        region: filters.region,
        state: filters.state,
        deliveryStates: filters.deliveryState
          ? { has: filters.deliveryState }
          : undefined,
        nationwideDelivery: filters.nationwideDelivery,
        pickupAvailable: filters.pickupAvailable,
        inspectionAvailable: filters.inspectionAvailable,
      },
      include: {
        brand: { select: this.brandSelection },
        images: { orderBy: { position: 'asc' } },
      },
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return products.map((product) => this.mapWithBrand(product));
  }

  async findPublicById(id: string) {
    return this.findPublicUnique({ id });
  }
  async findPublicBySlug(slug: string) {
    return this.findPublicUnique({ slug });
  }

  async findByBrand(brandId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        brandId,
        isActive: true,
        brand: { verificationStatus: BrandStatus.VERIFIED },
      },
      include: { images: { orderBy: { position: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return products.map((product) => this.map(product));
  }

  async findByCategory(category: string) {
    const products = await this.prisma.product.findMany({
      where: {
        category,
        isActive: true,
        brand: { verificationStatus: BrandStatus.VERIFIED },
      },
      include: { images: { orderBy: { position: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return products.map((product) => this.map(product));
  }

  async getCategories() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        brand: { verificationStatus: BrandStatus.VERIFIED },
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return products.map(({ category }) => category);
  }

  async update(id: string, dto: UpdateProductDto, actor: Actor) {
    const product = await this.requireProductAccess(id, actor);
    const { images, ...productData } = dto;
    const data: any = { ...productData };
    if (actor.role !== UserRole.ADMIN) {
      delete data.brandId;
      delete data.rewardEligible;
      delete data.isFeatured;
    } else if (dto.brandId && dto.brandId !== product.brandId) {
      await this.requireBrand(dto.brandId);
    }
    if (dto.name && dto.name !== product.name)
      data.slug = await this.uniqueSlug(dto.name, id);
    if (images !== undefined) {
      data.images = {
        deleteMany: {},
        create: this.imageCreateData(images, data.brandId || product.brandId),
      };
    }
    return this.map(
      await this.prisma.product.update({
        where: { id },
        data,
        include: { images: { orderBy: { position: 'asc' } } },
      }),
    );
  }

  async remove(id: string, actor: Actor) {
    await this.requireProductAccess(id, actor);
    await this.prisma.product.delete({ where: { id } });
  }

  private async findPublicUnique(where: { id?: string; slug?: string }) {
    const product = await this.prisma.product.findFirst({
      where: {
        ...where,
        isActive: true,
        brand: { verificationStatus: BrandStatus.VERIFIED },
      },
      include: {
        brand: { select: this.brandSelection },
        images: { orderBy: { position: 'asc' } },
      },
    });
    if (!product)
      throw new NotFoundException(
        'Active product from a verified brand not found',
      );
    return this.mapWithBrand(product);
  }

  private async requireBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand with ID ${id} not found`);
    return brand;
  }

  private async requireBrandAccess(id: string, actor: Actor) {
    const brand = await this.requireBrand(id);
    if (actor.role !== UserRole.ADMIN && brand.ownerId !== actor.userId) {
      throw new ForbiddenException(
        'You can only manage products for your own brand',
      );
    }
    return brand;
  }

  private async requireProductAccess(id: string, actor: Actor) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { brand: true },
    });
    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);
    if (
      actor.role !== UserRole.ADMIN &&
      product.brand.ownerId !== actor.userId
    ) {
      throw new ForbiddenException(
        'You can only manage products for your own brand',
      );
    }
    return product;
  }

  private async uniqueSlug(name: string, excludedId?: string) {
    const base = toSlug(name) || 'product';
    let slug = base;
    let suffix = 2;
    while (
      await this.prisma.product.findFirst({
        where: { slug, id: excludedId ? { not: excludedId } : undefined },
      })
    ) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  private readonly brandSelection = {
    id: true,
    name: true,
    slug: true,
    logo: true,
    whatsappLink: true,
    verificationStatus: true,
  } as const;

  private imageCreateData(
    images: ProductImageInputDto[] | undefined,
    brandId: string,
  ) {
    const expectedPrefix = `gadmar/brands/${brandId}/products/`;
    return (images || []).map((image, position) => {
      let host: string;
      try {
        host = new URL(image.secureUrl).hostname;
      } catch {
        throw new BadRequestException(
          'Each product image must have a valid Cloudinary secureUrl',
        );
      }
      if (
        !image.publicId.startsWith(expectedPrefix) ||
        host !== 'res.cloudinary.com'
      ) {
        throw new BadRequestException(
          'Product images must come from the signed upload folder for this brand',
        );
      }
      return { ...image, position, isPrimary: position === 0 };
    });
  }

  private map(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice,
      images: (product.images || []).map((image: any) => ({
        ...image,
        variants: {
          thumbnail: this.cloudinary.productImageUrl(
            image.publicId,
            'thumbnail',
          ),
          card: this.cloudinary.productImageUrl(image.publicId, 'card'),
          detail: this.cloudinary.productImageUrl(image.publicId, 'detail'),
          zoom: this.cloudinary.productImageUrl(image.publicId, 'zoom'),
        },
      })),
      category: product.category,
      condition: product.condition,
      specifications: product.specifications,
      stockStatus: product.stockStatus,
      stockQuantity: product.stockQuantity,
      warrantyInformation: product.warrantyInformation,
      returnsInformation: product.returnsInformation,
      rewardEligible: product.rewardEligible,
      region: product.region,
      state: product.state,
      lga: product.lga,
      deliveryStates: product.deliveryStates,
      nationwideDelivery: product.nationwideDelivery,
      pickupAvailable: product.pickupAvailable,
      inspectionAvailable: product.inspectionAvailable,
      brandId: product.brandId,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private mapWithBrand(product: any): ProductWithBrandDto {
    return { ...this.map(product), brand: product.brand };
  }
}
