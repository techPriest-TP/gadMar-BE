import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NigerianRegion, ProductCondition, StockStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto, ProductWithBrandDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Create a product for an owned brand', description: 'Brand owners cannot set reward eligibility or featured status. Those controls are admin-owned.' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({ status: 403, description: 'The selected brand does not belong to this owner' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: RequestUser) {
    return this.productService.create(dto, this.actor(user));
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Browse products from verified brands' })
  @ApiQuery({ name: 'condition', enum: ProductCondition, required: false })
  @ApiQuery({ name: 'stockStatus', enum: StockStatus, required: false })
  @ApiQuery({ name: 'region', enum: NigerianRegion, required: false })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'category', required: false, example: 'Smartphones' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minPrice', type: Number, required: false })
  @ApiQuery({ name: 'maxPrice', type: Number, required: false })
  @ApiQuery({ name: 'rewardEligible', type: Boolean, required: false })
  @ApiQuery({ name: 'state', required: false, example: 'Lagos' })
  @ApiQuery({ name: 'deliveryState', required: false, example: 'Ogun' })
  @ApiQuery({ name: 'nationwideDelivery', type: Boolean, required: false })
  @ApiQuery({ name: 'pickupAvailable', type: Boolean, required: false })
  @ApiQuery({ name: 'inspectionAvailable', type: Boolean, required: false })
  @ApiQuery({ name: 'featured', type: Boolean, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false, example: 0 })
  @ApiQuery({ name: 'take', type: Number, required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Active products belonging to verified brands', type: [ProductWithBrandDto] })
  findPublic(
    @Query('brandId') brandId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('condition') condition?: ProductCondition,
    @Query('stockStatus') stockStatus?: StockStatus,
    @Query('rewardEligible') rewardEligible?: string,
    @Query('region') region?: NigerianRegion,
    @Query('state') state?: string,
    @Query('deliveryState') deliveryState?: string,
    @Query('nationwideDelivery') nationwideDelivery?: string,
    @Query('pickupAvailable') pickupAvailable?: string,
    @Query('inspectionAvailable') inspectionAvailable?: string,
    @Query('featured') featured?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.productService.findPublic({
      brandId, category, search,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      condition, stockStatus, rewardEligible: this.boolean(rewardEligible), region, state, deliveryState,
      nationwideDelivery: this.boolean(nationwideDelivery), pickupAvailable: this.boolean(pickupAvailable),
      inspectionAvailable: this.boolean(inspectionAvailable), featured: this.boolean(featured),
      skip: skip ? Number(skip) : undefined, take: take ? Number(take) : undefined,
    });
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List categories containing active products from verified brands' })
  @ApiResponse({ status: 200, schema: { example: ['Smartphones', 'Laptops', 'Accessories'] } })
  getCategories() { return this.productService.getCategories(); }

  @Get('category/:category')
  @Public()
  @ApiOperation({ summary: 'Browse active products in a category' })
  @ApiParam({ name: 'category', example: 'Smartphones' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  findByCategory(@Param('category') category: string) { return this.productService.findByCategory(category); }

  @Get('brand/:brandId')
  @Public()
  @ApiOperation({ summary: 'Browse active products for a verified brand' })
  @ApiParam({ name: 'brandId', description: 'Brand ObjectId' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  findByBrand(@Param('brandId') brandId: string) { return this.productService.findByBrand(brandId); }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get an active product by its public slug' })
  @ApiParam({ name: 'slug', example: 'iphone-15-pro-max' })
  @ApiResponse({ status: 200, type: ProductWithBrandDto })
  @ApiResponse({ status: 404, description: 'Active product from a verified brand not found' })
  findBySlug(@Param('slug') slug: string) { return this.productService.findPublicBySlug(slug); }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get an active product by ID' })
  @ApiParam({ name: 'id', description: 'Product ObjectId' })
  @ApiResponse({ status: 200, type: ProductWithBrandDto })
  @ApiResponse({ status: 404, description: 'Active product from a verified brand not found' })
  findById(@Param('id') id: string) { return this.productService.findPublicById(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Update an owned product' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 403, description: 'The product does not belong to this brand owner' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: RequestUser) {
    return this.productService.update(id, dto, this.actor(user));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned product' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 403, description: 'The product does not belong to this brand owner' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.productService.remove(id, this.actor(user));
  }

  private actor(user: RequestUser) {
    return { userId: user.userId, role: user.role as UserRole };
  }

  private boolean(value?: string) {
    return value === undefined ? undefined : value === 'true';
  }
}
