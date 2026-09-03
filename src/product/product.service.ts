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
import { MediaService } from '../media/media.service';
import {
  CreateProductDto,
  ProductImageInputDto,
} from './dto/create-product.dto';
import {
  ProductResponseDto,
  ProductWithBrandDto,
} from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  AddProductImageDto,
  ReplaceProductImageDto,
  UpdateProductImageDto,
} from './dto/product-image-management.dto';

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
    private readonly media: MediaService,
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
    const product = await this.prisma.$transaction(async (transaction) => {
      await this.media.claimProductUploads(
        (images || []).map((image) => image.publicId),
        dto.brandId,
        actor,
        transaction,
      );
      return transaction.product.create({
        data,
        include: { images: { orderBy: { position: 'asc' } } },
      });
    });
    return this.map(product);
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
    const data: any = { ...dto };
    if (actor.role !== UserRole.ADMIN) {
      delete data.brandId;
      delete data.rewardEligible;
      delete data.isFeatured;
    } else if (dto.brandId && dto.brandId !== product.brandId) {
      await this.requireBrand(dto.brandId);
    }
    if (dto.name && dto.name !== product.name)
      data.slug = await this.uniqueSlug(dto.name, id);
    return this.map(
      await this.prisma.product.update({
        where: { id },
        data,
        include: { images: { orderBy: { position: 'asc' } } },
      }),
    );
  }

  async remove(id: string, actor: Actor) {
    const product = await this.requireProductAccess(id, actor);
    await this.prisma.product.delete({ where: { id } });
    await Promise.all(
      product.images.map((image) =>
        this.media.deleteOrQueue(image.publicId, product.brandId, actor.userId),
      ),
    );
  }

  async addImage(id: string, dto: AddProductImageDto, actor: Actor) {
    const product = await this.requireProductAccess(id, actor);
    if (product.images.length >= 8) {
      throw new BadRequestException('A product can have at most 8 images');
    }
    const [imageData] = this.imageCreateData([dto], product.brandId);
    await this.prisma.$transaction(async (transaction) => {
      await this.media.claimProductUploads(
        [dto.publicId],
        product.brandId,
        actor,
        transaction,
      );
      await transaction.productImage.create({
        data: {
          ...imageData,
          productId: id,
          position: product.images.length,
          isPrimary: product.images.length === 0,
        },
      });
    });
    return this.managedProductResponse(id);
  }

  async reorderImages(id: string, imageIds: string[], actor: Actor) {
    const product = await this.requireProductAccess(id, actor);
    const currentIds = new Set(product.images.map((image) => image.id));
    if (
      imageIds.length !== currentIds.size ||
      imageIds.some((imageId) => !currentIds.has(imageId))
    ) {
      throw new BadRequestException(
        'imageIds must contain every current product image exactly once',
      );
    }
    await this.prisma.$transaction(
      imageIds.map((imageId, position) =>
        this.prisma.productImage.update({
          where: { id: imageId },
          data: { position },
        }),
      ),
    );
    return this.managedProductResponse(id);
  }

  async setPrimaryImage(id: string, imageId: string, actor: Actor) {
    const product = await this.requireProductAccess(id, actor);
    this.requireImage(product.images, imageId);
    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false },
      }),
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);
    return this.managedProductResponse(id);
  }

  async updateImage(
    id: string,
    imageId: string,
    dto: UpdateProductImageDto,
    actor: Actor,
  ) {
    const product = await this.requireProductAccess(id, actor);
    this.requireImage(product.images, imageId);
    await this.prisma.productImage.update({
      where: { id: imageId },
      data: { altText: dto.altText },
    });
    return this.managedProductResponse(id);
  }

  async replaceImage(
    id: string,
    imageId: string,
    dto: ReplaceProductImageDto,
    actor: Actor,
  ) {
    const product = await this.requireProductAccess(id, actor);
    const existing = this.requireImage(product.images, imageId);
    const [imageData] = this.imageCreateData([dto], product.brandId);
    await this.prisma.$transaction(async (transaction) => {
      await this.media.claimProductUploads(
        [dto.publicId],
        product.brandId,
        actor,
        transaction,
      );
      await transaction.productImage.update({
        where: { id: imageId },
        data: {
          ...imageData,
          position: existing.position,
          isPrimary: existing.isPrimary,
        },
      });
    });
    await this.media.deleteOrQueue(
      existing.publicId,
      product.brandId,
      actor.userId,
    );
    return this.managedProductResponse(id);
  }

  async removeImage(id: string, imageId: string, actor: Actor) {
    const product = await this.requireProductAccess(id, actor);
    const existing = this.requireImage(product.images, imageId);
    const remaining = product.images.filter((image) => image.id !== imageId);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.productImage.delete({ where: { id: imageId } });
      for (const [position, image] of remaining.entries()) {
        await transaction.productImage.update({
          where: { id: image.id },
          data: {
            position,
            isPrimary: existing.isPrimary ? position === 0 : image.isPrimary,
          },
        });
      }
    });
    await this.media.deleteOrQueue(
      existing.publicId,
      product.brandId,
      actor.userId,
    );
    return this.managedProductResponse(id);
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
      include: {
        brand: true,
        images: { orderBy: { position: 'asc' } },
      },
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

  private requireImage<T extends { id: string }>(
    images: T[],
    imageId: string,
  ): T {
    const image = images.find((candidate) => candidate.id === imageId);
    if (!image) {
      throw new NotFoundException(
        `Image with ID ${imageId} does not belong to this product`,
      );
    }
    return image;
  }

  private async managedProductResponse(
    id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: 'asc' } } },
    });
    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);
    return this.map(product);
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
