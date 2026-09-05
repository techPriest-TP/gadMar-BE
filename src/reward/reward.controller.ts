import {
  ForbiddenException,
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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RewardService } from './reward.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import {
  CreditSummaryDto,
  RewardResponseDto,
  RewardStatsDto,
  UserStreakDto,
} from './dto/reward-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RewardStatus, RewardType } from '@prisma/client';

@ApiBearerAuth()
@Controller('rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Create a manual credit entry (Admin only)',
    description:
      'Use this for admin adjustments only. Normal purchase credits are created automatically when a purchase is confirmed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Credit entry created successfully',
    type: RewardResponseDto,
    schema: {
      example: {
        id: 'credit-entry-id',
        userId: 'user-id',
        type: 'MANUAL_CREDIT',
        amount: 5000,
        status: 'AVAILABLE',
        description: 'Manual customer credit adjustment',
        availableAt: '2026-09-05T16:30:00.000Z',
        createdAt: '2026-09-05T16:30:00.000Z',
        updatedAt: '2026-09-05T16:30:00.000Z',
      },
    },
  })
  async create(@Body() createDto: CreateRewardDto): Promise<RewardResponseDto> {
    return this.rewardService.create(createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Get all GadMar Credits entries (Admin only)',
    description:
      'Admin ledger view for purchase credits, campaign bonuses, manual credits, and withdrawal states.',
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by customer user ID.' })
  @ApiQuery({ name: 'status', required: false, enum: RewardStatus, description: 'Filter by credit status: PENDING, AVAILABLE, WITHDRAWN, EXPIRED, or CANCELLED.' })
  @ApiQuery({ name: 'type', required: false, enum: RewardType, description: 'Filter by credit source/type.' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip for pagination.' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to return for pagination.' })
  @ApiResponse({
    status: 200,
    description: 'List of credit entries',
    type: [RewardResponseDto],
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: RewardStatus,
    @Query('type') type?: RewardType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<RewardResponseDto[]> {
    return this.rewardService.findAll({
      userId,
      status,
      type,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('my-rewards')
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Get current user GadMar Credits entries',
    description:
      'Customer ledger. PENDING credits are visible but not withdrawable until the linked brand commission is paid.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user credit entries',
    type: [RewardResponseDto],
    schema: {
      example: [
        {
          id: 'pending-credit-id',
          userId: 'user-id',
          type: 'BASE_PURCHASE_CREDIT',
          amount: 30000,
          status: 'PENDING',
          description: 'Base GadMar Credits from 40% of GadMar commission',
          transactionId: 'transaction-intent-id',
          commissionId: 'commission-id',
          expiresAt: '2026-10-05T16:30:00.000Z',
          createdAt: '2026-09-05T16:00:00.000Z',
          updatedAt: '2026-09-05T16:00:00.000Z',
        },
        {
          id: 'available-credit-id',
          userId: 'user-id',
          type: 'FIRST_PURCHASE_BONUS',
          amount: 5000,
          status: 'AVAILABLE',
          description: 'First confirmed purchase bonus credits',
          transactionId: 'transaction-intent-id',
          commissionId: 'commission-id',
          availableAt: '2026-09-05T16:30:00.000Z',
          expiresAt: '2026-10-05T16:30:00.000Z',
          createdAt: '2026-09-05T16:00:00.000Z',
          updatedAt: '2026-09-05T16:30:00.000Z',
        },
      ],
    },
  })
  async findMyRewards(@CurrentUser('userId') userId: string): Promise<RewardResponseDto[]> {
    return this.rewardService.findByUser(userId);
  }

  @Get('my-streak')
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Get current user legacy purchase streak',
    description:
      'Legacy helper kept for backwards compatibility. GadMar Credits should use my-credit-summary instead.',
  })
  @ApiResponse({
    status: 200,
    description: 'User streak information',
    type: UserStreakDto,
  })
  async getMyStreak(@CurrentUser('userId') userId: string): Promise<UserStreakDto> {
    return this.rewardService.getUserStreak(userId);
  }

  @Get('my-credit-summary')
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Get current user GadMar Credits summary',
    description:
      'Best endpoint for the customer dashboard credit cards. Use withdrawableCredits for cash-out balance and pendingCredits for commission-awaiting earnings.',
  })
  @ApiResponse({
    status: 200,
    description: 'User credit summary',
    type: CreditSummaryDto,
    schema: {
      example: {
        totalRewards: 4,
        totalAmount: 65000,
        pendingRewards: 2,
        pendingAmount: 35000,
        availableRewards: 1,
        availableAmount: 30000,
        withdrawnRewards: 1,
        withdrawnAmount: 0,
        claimedRewards: 0,
        claimedAmount: 0,
        expiredRewards: 0,
        expiredAmount: 0,
        cancelledRewards: 0,
        cancelledAmount: 0,
        lifetimeCredits: 65000,
        withdrawableCredits: 30000,
        pendingCredits: 35000,
      },
    },
  })
  async getMyCreditSummary(
    @CurrentUser('userId') userId: string,
  ): Promise<CreditSummaryDto> {
    return this.rewardService.getCreditSummary(userId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Get GadMar Credits statistics (Admin only)',
    description:
      'Admin aggregate counts and amounts by credit status. This is useful for reconciliation and liability reporting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit statistics',
    type: RewardStatsDto,
  })
  async getStats(): Promise<RewardStatsDto> {
    return this.rewardService.getRewardStats();
  }

  @Get('credit-summary')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Get platform GadMar Credits summary (Admin only)',
    description:
      'Platform-wide credit liability summary. Pending credits are not cash-out eligible until commission reconciliation is complete.',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform credit summary',
    type: CreditSummaryDto,
    schema: {
      example: {
        totalRewards: 120,
        totalAmount: 1800000,
        pendingRewards: 45,
        pendingAmount: 650000,
        availableRewards: 60,
        availableAmount: 950000,
        withdrawnRewards: 10,
        withdrawnAmount: 180000,
        claimedRewards: 0,
        claimedAmount: 0,
        expiredRewards: 3,
        expiredAmount: 15000,
        cancelledRewards: 2,
        cancelledAmount: 5000,
        lifetimeCredits: 1800000,
        withdrawableCredits: 950000,
        pendingCredits: 650000,
      },
    },
  })
  async getCreditSummary(): Promise<CreditSummaryDto> {
    return this.rewardService.getCreditSummary();
  }

  @Get('my-stats')
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Get current user GadMar Credits statistics',
    description:
      'Detailed customer credit statistics. For simple dashboard balances, prefer my-credit-summary.',
  })
  @ApiResponse({
    status: 200,
    description: 'User credit statistics',
    type: RewardStatsDto,
  })
  async getMyStats(@CurrentUser('userId') userId: string): Promise<RewardStatsDto> {
    return this.rewardService.getRewardStats(userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'Get credit entry by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Credit entry ID.' })
  @ApiResponse({
    status: 200,
    description: 'Credit entry found',
    type: RewardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Credit entry not found' })
  async findOne(@Param('id') id: string): Promise<RewardResponseDto> {
    return this.rewardService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Update credit entry (Admin only)',
    description:
      'Admin-only correction endpoint. Automatic purchase credits should normally move from PENDING to AVAILABLE through commission payment.',
  })
  @ApiParam({ name: 'id', description: 'Credit entry ID.' })
  @ApiResponse({
    status: 200,
    description: 'Credit entry updated successfully',
    type: RewardResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRewardDto,
  ): Promise<RewardResponseDto> {
    return this.rewardService.update(id, updateDto);
  }

  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Withdraw available credits',
    description:
      'Only AVAILABLE credits can be withdrawn. PENDING credits are waiting for brand commission reconciliation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Credits withdrawn successfully',
    type: RewardResponseDto,
    schema: {
      example: {
        id: 'available-credit-id',
        userId: 'user-id',
        type: 'BASE_PURCHASE_CREDIT',
        amount: 30000,
        status: 'WITHDRAWN',
        description: 'Base GadMar Credits from 40% of GadMar commission',
        transactionId: 'transaction-intent-id',
        commissionId: 'commission-id',
        availableAt: '2026-09-05T16:30:00.000Z',
        claimedAt: '2026-09-10T10:00:00.000Z',
        withdrawnAt: '2026-09-10T10:00:00.000Z',
        createdAt: '2026-09-05T16:00:00.000Z',
        updatedAt: '2026-09-10T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Credit entry is not AVAILABLE yet. PENDING credits still await brand commission payment.',
  })
  @ApiParam({ name: 'id', description: 'Available credit entry ID.' })
  async claimReward(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<RewardResponseDto> {
    // Verify the reward belongs to the current user
    const reward = await this.rewardService.findOne(id);
    if (reward.userId !== userId) {
      throw new ForbiddenException('You can only withdraw your own credits');
    }
    return this.rewardService.claimReward(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'Delete credit entry (Admin only)' })
  @ApiParam({ name: 'id', description: 'Credit entry ID.' })
  @ApiResponse({ status: 204, description: 'Credit entry deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rewardService.remove(id);
  }
}
