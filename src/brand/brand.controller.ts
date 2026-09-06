import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BrandStatus, NigerianRegion, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BrandService } from './brand.service';
import {
  BrandResponseDto,
  BrandStorefrontDto,
  BrandWithStatsDto,
} from './dto/brand-response.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import {
  ReviewBrandDto,
  UpdateBrandDto,
  UpdateBrandPurchaseConfirmationTrustDto,
} from './dto/update-brand.dto';

@ApiBearerAuth()
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
  @ApiOperation({
    summary: 'Create a brand or submit a brand for verification',
  })
  @ApiBody({ type: CreateBrandDto })
  @ApiResponse({
    status: 201,
    description: 'Brand created with pending verification status',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({
    status: 403,
    description: 'Admin or brand-owner role required',
  })
  create(@Body() dto: CreateBrandDto, @CurrentUser() user: RequestUser) {
    return this.brandService.create(dto, this.actor(user));
  }

  @Get()
  @Public()
  @ApiTags('Public Website')
  @ApiQuery({ name: 'region', enum: NigerianRegion, required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'deliveryState', required: false })
  @ApiQuery({ name: 'featured', type: Boolean, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'nationwideDelivery', type: Boolean, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false, example: 0 })
  @ApiQuery({ name: 'take', type: Number, required: false, example: 20 })
  @ApiOperation({
    summary: 'Browse verified gadget brands',
    description:
      'Returns verified brands only. Supports discovery by location and delivery coverage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verified brands',
    type: [BrandResponseDto],
  })
  findPublic(
    @Query('featured') featured?: string,
    @Query('search') search?: string,
    @Query('region') region?: NigerianRegion,
    @Query('state') state?: string,
    @Query('deliveryState') deliveryState?: string,
    @Query('nationwideDelivery') nationwideDelivery?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.brandService.findPublic({
      featured: this.boolean(featured),
      search,
      region,
      state,
      deliveryState,
      nationwideDelivery: this.boolean(nationwideDelivery),
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('featured')
  @Public()
  @ApiTags('Public Website')
  @ApiOperation({ summary: 'Get currently featured verified brands' })
  @ApiResponse({ status: 200, type: [BrandResponseDto] })
  findFeatured() {
    return this.brandService.findFeatured();
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'List brands for administration and verification' })
  @ApiQuery({ name: 'status', enum: BrandStatus, required: false })
  @ApiResponse({ status: 200, type: [BrandResponseDto] })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  findAllAdmin(@Query('status') status?: BrandStatus) {
    return this.brandService.findAllAdmin(status);
  }

  @Get('my-brands')
  @Roles(UserRole.BRAND_OWNER, UserRole.ADMIN)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
  @ApiOperation({ summary: 'List brands owned by the authenticated user' })
  @ApiResponse({ status: 200, type: [BrandResponseDto] })
  findMine(@CurrentUser('userId') userId: string) {
    return this.brandService.findByOwner(userId);
  }

  @Get('slug/:slug/store')
  @Public()
  @ApiTags('Public Website')
  @ApiOperation({
    summary: 'Get a verified brand storefront',
    description:
      'Returns store information and active products for the shareable public storefront.',
  })
  @ApiParam({ name: 'slug', example: 'oico-techs' })
  @ApiResponse({ status: 200, type: BrandStorefrontDto })
  @ApiResponse({
    status: 404,
    description: 'Verified brand storefront not found',
  })
  getStorefront(@Param('slug') slug: string) {
    return this.brandService.getStorefront(slug);
  }

  @Get('slug/:slug')
  @Public()
  @ApiTags('Public Website')
  @ApiOperation({ summary: 'Get a verified brand trust profile by slug' })
  @ApiParam({ name: 'slug', example: 'oico-techs' })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiResponse({ status: 404, description: 'Verified brand not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.brandService.findPublicBySlug(slug);
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
  @ApiOperation({ summary: 'Get operational statistics for an owned brand' })
  @ApiParam({ name: 'id', description: 'Brand ObjectId' })
  @ApiResponse({ status: 200, type: BrandWithStatsDto })
  @ApiResponse({
    status: 403,
    description: 'The brand does not belong to this owner',
  })
  getStats(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.brandService.getBrandStats(id, this.actor(user));
  }

  @Get(':id')
  @Public()
  @ApiTags('Public Website')
  @ApiOperation({ summary: 'Get a verified brand trust profile by ID' })
  @ApiParam({ name: 'id', description: 'Brand ObjectId' })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiResponse({ status: 404, description: 'Verified brand not found' })
  findById(@Param('id') id: string) {
    return this.brandService.findPublicById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
  @ApiOperation({ summary: 'Update an owned brand profile or storefront' })
  @ApiBody({ type: UpdateBrandDto })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiResponse({
    status: 403,
    description: 'The brand does not belong to this owner',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.brandService.update(id, dto, this.actor(user));
  }

  @Patch(':id/verification')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'Review or change brand verification status' })
  @ApiBody({ type: ReviewBrandDto })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  review(@Param('id') id: string, @Body() dto: ReviewBrandDto) {
    return this.brandService.review(id, dto);
  }

  @Patch(':id/purchase-confirmation-trust')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Enable or disable direct purchase confirmation for a brand',
    description:
      'New brands should use customer confirmation links by default. Admins can enable direct confirmation after the brand earns enough confidence.',
  })
  @ApiBody({ type: UpdateBrandPurchaseConfirmationTrustDto })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  updatePurchaseConfirmationTrust(
    @Param('id') id: string,
    @Body() dto: UpdateBrandPurchaseConfirmationTrustDto,
  ) {
    return this.brandService.updatePurchaseConfirmationTrust(id, dto);
  }

  @Post(':id/featured')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Feature a brand',
    description: 'Optionally provide an ISO date in the until query parameter.',
  })
  @ApiQuery({
    name: 'until',
    type: String,
    required: false,
    example: '2027-12-31T23:59:59.000Z',
  })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  setFeatured(@Param('id') id: string, @Query('until') until?: string) {
    return this.brandService.setFeatured(
      id,
      until ? new Date(until) : undefined,
    );
  }

  @Delete(':id/featured')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'Remove featured status from a brand' })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  removeFeatured(@Param('id') id: string) {
    return this.brandService.removeFeatured(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'Delete a brand' })
  @ApiResponse({ status: 204, description: 'Brand deleted' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }

  private actor(user: RequestUser) {
    return { userId: user.userId, role: user.role as UserRole };
  }

  private boolean(value?: string) {
    return value === undefined ? undefined : value === 'true';
  }
}
