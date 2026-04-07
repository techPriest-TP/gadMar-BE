import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, CommissionStatus } from '@prisma/client';

class CalculateCommissionDto {
  transactionAmount: number;
  commissionRate?: number;
}

@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Post('calculate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate commission for a transaction amount' })
  @ApiResponse({
    status: 200,
    description: 'Commission calculation result',
  })
  async calculateCommission(@Body() data: CalculateCommissionDto) {
    return this.commissionService.calculateCommission(
      data.transactionAmount,
      data.commissionRate,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all commissions (Admin only)' })
  @ApiQuery({ name: 'brandId', required: false, type: String, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'status', required: false, enum: CommissionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Skip N records' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Take N records' })
  @ApiResponse({
    status: 200,
    description: 'List of commissions',
    type: Array,
  })
  async findAll(
    @Query('brandId') brandId?: string,
    @Query('status') status?: CommissionStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.commissionService.findAll({
      brandId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get commission statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Commission statistics',
  })
  async getStats() {
    return this.commissionService.getCommissionStats();
  }

  @Get('my-commissions')
  @Roles(UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get commissions for brand owner' })
  @ApiResponse({
    status: 200,
    description: 'List of brand commissions',
    type: Array,
  })
  async findMyCommissions(
    @CurrentUser('userId') userId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    // Find brands owned by user
    const brands = await this.commissionService['prisma'].brand.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const brandIds = brands.map((b) => b.id);

    if (brandIds.length === 0) {
      return [];
    }

    // Get commissions for all owned brands
    const commissions = await this.commissionService['prisma'].commission.findMany({
      where: {
        brandId: { in: brandIds },
      },
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return commissions;
  }

  @Get('my-stats')
  @Roles(UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get commission statistics for brand owner' })
  @ApiResponse({
    status: 200,
    description: 'Brand commission statistics',
  })
  async getMyStats(@CurrentUser('userId') userId: string) {
    // Find brands owned by user
    const brands = await this.commissionService['prisma'].brand.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const brandIds = brands.map((b) => b.id);

    if (brandIds.length === 0) {
      return {
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        waivedCommissions: 0,
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        waivedAmount: 0,
      };
    }

    // Aggregate stats for all owned brands
    const stats = await Promise.all(
      brandIds.map((brandId) => this.commissionService.getCommissionStats(brandId)),
    );

    return stats.reduce(
      (acc, stat) => ({
        totalCommissions: acc.totalCommissions + stat.totalCommissions,
        pendingCommissions: acc.pendingCommissions + stat.pendingCommissions,
        paidCommissions: acc.paidCommissions + stat.paidCommissions,
        waivedCommissions: acc.waivedCommissions + stat.waivedCommissions,
        totalAmount: acc.totalAmount + stat.totalAmount,
        pendingAmount: acc.pendingAmount + stat.pendingAmount,
        paidAmount: acc.paidAmount + stat.paidAmount,
        waivedAmount: acc.waivedAmount + stat.waivedAmount,
      }),
      {
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        waivedCommissions: 0,
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        waivedAmount: 0,
      },
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get commission by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Commission found',
  })
  @ApiResponse({ status: 404, description: 'Commission not found' })
  async findOne(@Param('id') id: string) {
    return this.commissionService.findOne(id);
  }

  @Post(':id/pay')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark commission as paid (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Commission marked as paid',
  })
  async markAsPaid(@Param('id') id: string) {
    return this.commissionService.markAsPaid(id);
  }

  @Post(':id/waive')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Waive commission (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Commission waived',
  })
  async waiveCommission(@Param('id') id: string) {
    return this.commissionService.waiveCommission(id);
  }

  @Get('brand/:brandId/report')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get commission report for a brand' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Brand commission report',
  })
  async getBrandReport(
    @Param('brandId') brandId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.commissionService.getBrandCommissionReport(
      brandId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
