import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto, ProductWithBrandDto } from './dto/product-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productService.create(createProductDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'brandId', required: false, type: String, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product name' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Skip N records' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Take N records' })
  @ApiResponse({
    status: 200,
    description: 'List of products',
    type: [ProductWithBrandDto],
  })
  async findAll(
    @Query('brandId') brandId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ProductWithBrandDto[]> {
    return this.productService.findAllWithBrand({
      brandId,
      category,
      search,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      isActive: true,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all product categories' })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
    type: [String],
  })
  async getCategories(): Promise<string[]> {
    return this.productService.getCategories();
  }

  @Get('category/:category')
  @Public()
  @ApiOperation({ summary: 'Get products by category' })
  @ApiResponse({
    status: 200,
    description: 'List of products in category',
    type: [ProductResponseDto],
  })
  async findByCategory(@Param('category') category: string): Promise<ProductResponseDto[]> {
    return this.productService.findByCategory(category);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductWithBrandDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string): Promise<ProductWithBrandDto> {
    return this.productService.findOneWithBrand(id);
  }

  @Get('brand/:brandId')
  @Public()
  @ApiOperation({ summary: 'Get products by brand ID' })
  @ApiResponse({
    status: 200,
    description: 'List of products for brand',
    type: [ProductResponseDto],
  })
  async findByBrand(@Param('brandId') brandId: string): Promise<ProductResponseDto[]> {
    return this.productService.findByBrand(brandId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.productService.remove(id);
  }
}
