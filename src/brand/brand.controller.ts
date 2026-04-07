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
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandResponseDto, BrandWithStatsDto } from './dto/brand-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Brand created successfully',
    type: BrandResponseDto,
  })
  async create(@Body() createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    return this.brandService.create(createBrandDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all brands' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean, description: 'Filter by featured brands' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by brand name' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Skip N records' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Take N records' })
  @ApiResponse({
    status: 200,
    description: 'List of brands',
    type: [BrandResponseDto],
  })
  async findAll(
    @Query('featured') featured?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<BrandResponseDto[]> {
    return this.brandService.findAll({
      featured: featured !== undefined ? featured === 'true' : undefined,
      search,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured brands' })
  @ApiResponse({
    status: 200,
    description: 'List of featured brands',
    type: [BrandResponseDto],
  })
  async findFeatured(): Promise<BrandResponseDto[]> {
    return this.brandService.findFeatured();
  }

  @Get('my-brands')
  @Roles(UserRole.BRAND_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get brands owned by current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user brands',
    type: [BrandResponseDto],
  })
  async findMyBrands(@CurrentUser('userId') userId: string): Promise<BrandResponseDto[]> {
    return this.brandService.findByOwner(userId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiResponse({
    status: 200,
    description: 'Brand found',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findOne(@Param('id') id: string): Promise<BrandResponseDto> {
    return this.brandService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get brand statistics' })
  @ApiResponse({
    status: 200,
    description: 'Brand statistics',
    type: BrandWithStatsDto,
  })
  async getBrandStats(@Param('id') id: string): Promise<BrandWithStatsDto> {
    return this.brandService.getBrandStats(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Update brand' })
  @ApiResponse({
    status: 200,
    description: 'Brand updated successfully',
    type: BrandResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    return this.brandService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete brand (Admin only)' })
  @ApiResponse({ status: 204, description: 'Brand deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.brandService.remove(id);
  }

  @Post(':id/featured')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set brand as featured (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Brand set as featured',
    type: BrandResponseDto,
  })
  async setFeatured(
    @Param('id') id: string,
    @Query('until') until?: string,
  ): Promise<BrandResponseDto> {
    const featuredUntil = until ? new Date(until) : undefined;
    return this.brandService.setFeatured(id, featuredUntil);
  }

  @Delete(':id/featured')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove brand from featured (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Brand removed from featured',
    type: BrandResponseDto,
  })
  async removeFeatured(@Param('id') id: string): Promise<BrandResponseDto> {
    return this.brandService.removeFeatured(id);
  }
}
