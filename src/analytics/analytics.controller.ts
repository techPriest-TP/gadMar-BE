import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService, DashboardStats, MonthlyData } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
    type: Object,
  })
  async getDashboardStats(): Promise<DashboardStats> {
    return this.analyticsService.getDashboardStats();
  }

  @Get('monthly')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get monthly statistics' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to return' })
  @ApiResponse({
    status: 200,
    description: 'Monthly statistics',
    type: Array,
  })
  async getMonthlyStats(@Query('months') months?: string): Promise<MonthlyData[]> {
    return this.analyticsService.getMonthlyStats(months ? parseInt(months, 10) : 6);
  }

  @Get('top-brands')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get top performing brands' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of brands to return' })
  @ApiResponse({
    status: 200,
    description: 'Top performing brands',
    type: Array,
  })
  async getTopBrands(@Query('limit') limit?: string) {
    return this.analyticsService.getTopBrands(limit ? parseInt(limit, 10) : 5);
  }

  @Get('top-products')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get top performing products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of products to return' })
  @ApiResponse({
    status: 200,
    description: 'Top performing products',
    type: Array,
  })
  async getTopProducts(@Query('limit') limit?: string) {
    return this.analyticsService.getTopProducts(limit ? parseInt(limit, 10) : 5);
  }

  @Get('top-users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get top users by spending' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of users to return' })
  @ApiResponse({
    status: 200,
    description: 'Top users by spending',
    type: Array,
  })
  async getTopUsers(@Query('limit') limit?: string) {
    return this.analyticsService.getTopUsers(limit ? parseInt(limit, 10) : 5);
  }

  @Get('commission-report')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get commission report' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Commission report by brand',
    type: Array,
  })
  async getCommissionReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCommissionReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
