import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BrandStatus, NigerianRegion, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ReviewBrandDto, UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Create a brand or submit a brand for verification' })
  create(@Body() dto: CreateBrandDto, @CurrentUser() user: RequestUser) {
    return this.brandService.create(dto, this.actor(user));
  }

  @Get()
  @Public()
  @ApiQuery({ name: 'region', enum: NigerianRegion, required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'deliveryState', required: false })
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
      featured: this.boolean(featured), search, region, state, deliveryState,
      nationwideDelivery: this.boolean(nationwideDelivery),
      skip: skip ? Number(skip) : undefined, take: take ? Number(take) : undefined,
    });
  }

  @Get('featured')
  @Public()
  findFeatured() { return this.brandService.findFeatured(); }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  findAllAdmin(@Query('status') status?: BrandStatus) {
    return this.brandService.findAllAdmin(status);
  }

  @Get('my-brands')
  @Roles(UserRole.BRAND_OWNER, UserRole.ADMIN)
  findMine(@CurrentUser('userId') userId: string) { return this.brandService.findByOwner(userId); }

  @Get('slug/:slug/store')
  @Public()
  getStorefront(@Param('slug') slug: string) { return this.brandService.getStorefront(slug); }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) { return this.brandService.findPublicBySlug(slug); }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  getStats(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.brandService.getBrandStats(id, this.actor(user));
  }

  @Get(':id')
  @Public()
  findById(@Param('id') id: string) { return this.brandService.findPublicById(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto, @CurrentUser() user: RequestUser) {
    return this.brandService.update(id, dto, this.actor(user));
  }

  @Patch(':id/verification')
  @Roles(UserRole.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewBrandDto) { return this.brandService.review(id, dto); }

  @Post(':id/featured')
  @Roles(UserRole.ADMIN)
  setFeatured(@Param('id') id: string, @Query('until') until?: string) {
    return this.brandService.setFeatured(id, until ? new Date(until) : undefined);
  }

  @Delete(':id/featured')
  @Roles(UserRole.ADMIN)
  removeFeatured(@Param('id') id: string) { return this.brandService.removeFeatured(id); }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.brandService.remove(id); }

  private actor(user: RequestUser) {
    return { userId: user.userId, role: user.role as UserRole };
  }

  private boolean(value?: string) {
    return value === undefined ? undefined : value === 'true';
  }
}
