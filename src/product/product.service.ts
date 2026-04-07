import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto, ProductWithBrandDto } from './dto/product-response.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    // Verify brand exists
    const brand = await this.prisma.brand.findUnique({
      where: { id: createProductDto.brandId },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${createProductDto.brandId} not found`);
    }

    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    return this.mapToProductResponse(product);
  }

  async findAll(options?: {
    brandId?: string;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<ProductResponseDto[]> {
    const where: any = {};

    if (options?.brandId) {
      where.brandId = options.brandId;
    }

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.search) {
      where.name = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      where.price = {};
      if (options.minPrice !== undefined) {
        where.price.gte = options.minPrice;
      }
      if (options.maxPrice !== undefined) {
        where.price.lte = options.maxPrice;
      }
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const products = await this.prisma.product.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return products.map(this.mapToProductResponse);
  }

  async findAllWithBrand(options?: {
    brandId?: string;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<ProductWithBrandDto[]> {
    const where: any = {};

    if (options?.brandId) {
      where.brandId = options.brandId;
    }

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.search) {
      where.name = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      where.price = {};
      if (options.minPrice !== undefined) {
        where.price.gte = options.minPrice;
      }
      if (options.maxPrice !== undefined) {
        where.price.lte = options.maxPrice;
      }
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
            whatsappLink: true,
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });

    return products.map(this.mapToProductWithBrand);
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToProductResponse(product);
  }

  async findOneWithBrand(id: string): Promise<ProductWithBrandDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
            whatsappLink: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToProductWithBrand(product);
  }

  async findByBrand(brandId: string): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });

    return products.map(this.mapToProductResponse);
  }

  async findByCategory(category: string): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: { category, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return products.map(this.mapToProductResponse);
  }

  async getCategories(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });

    return products.map((p) => p.category);
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Verify brand exists if being updated
    if (updateProductDto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: updateProductDto.brandId },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${updateProductDto.brandId} not found`);
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });

    return this.mapToProductResponse(updatedProduct);
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.prisma.product.delete({
      where: { id },
    });
  }

  private mapToProductResponse(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      category: product.category,
      brandId: product.brandId,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private mapToProductWithBrand(product: any): ProductWithBrandDto {
    return {
      ...this.mapToProductResponse(product),
      brand: product.brand,
    };
  }
}
