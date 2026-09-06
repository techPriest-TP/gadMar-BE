import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('customers/dashboard')
  @Roles(UserRole.USER)
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Get the current customer dashboard summary',
    description:
      'Aggregates purchase tracking, credit balances, withdrawal states, and recent customer activity for the dashboard overview.',
  })
  @ApiResponse({ status: 200, description: 'Customer dashboard summary.' })
  getCustomerDashboard(@CurrentUser('userId') userId: string) {
    return this.dashboardService.getCustomerDashboard(userId);
  }

  @Get('brand-owners/dashboard')
  @Roles(UserRole.BRAND_OWNER)
  @ApiTags('Brand Owner Dashboard')
  @ApiOperation({
    summary: 'Get the current brand owner dashboard summary',
    description:
      'Aggregates owned brands, products, purchase leads, commission state, direct-confirmation trust state, and recent activity.',
  })
  @ApiResponse({ status: 200, description: 'Brand owner dashboard summary.' })
  getBrandOwnerDashboard(@CurrentUser('userId') userId: string) {
    return this.dashboardService.getBrandOwnerDashboard(userId);
  }

  @Get('admin/dashboard')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Get the super admin dashboard summary',
    description:
      'Aggregates marketplace totals, pending review queues, commission reconciliation, credit liability, withdrawals, and recent platform activity.',
  })
  @ApiResponse({ status: 200, description: 'Super admin dashboard summary.' })
  getAdminDashboard(@CurrentUser() user: RequestUser) {
    return this.dashboardService.getAdminDashboard(user.userId);
  }
}
