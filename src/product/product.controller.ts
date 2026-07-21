import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NigerianRegion, ProductCondition, StockStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
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
  create(@Body() dto: CreateProductDto, @CurrentUser() user: RequestUser) {
    return this.productService.create(dto, this.actor(user));
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Browse products from verified brands' })
  @ApiQuery({ name: 'condition', enum: ProductCondition, required: false })
  @ApiQuery({ name: 'stockStatus', enum: StockStatus, required: false })
  @ApiQuery({ name: 'region', enum: NigerianRegion, required: false })
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
  getCategories() { return this.productService.getCategories(); }

  @Get('category/:category')
  @Public()
  findByCategory(@Param('category') category: string) { return this.productService.findByCategory(category); }

  @Get('brand/:brandId')
  @Public()
  findByBrand(@Param('brandId') brandId: string) { return this.productService.findByBrand(brandId); }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) { return this.productService.findPublicBySlug(slug); }

  @Get(':id')
  @Public()
  findById(@Param('id') id: string) { return this.productService.findPublicById(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: RequestUser) {
    return this.productService.update(id, dto, this.actor(user));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
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
