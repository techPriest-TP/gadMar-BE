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
import { RewardService } from './reward.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RewardResponseDto, RewardStatsDto, UserStreakDto } from './dto/reward-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RewardStatus, RewardType } from '@prisma/client';

@ApiTags('Rewards')
@ApiBearerAuth()
@Controller('rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new reward (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Reward created successfully',
    type: RewardResponseDto,
  })
  async create(@Body() createDto: CreateRewardDto): Promise<RewardResponseDto> {
    return this.rewardService.create(createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all rewards (Admin only)' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'status', required: false, enum: RewardStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, enum: RewardType, description: 'Filter by type' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Skip N records' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Take N records' })
  @ApiResponse({
    status: 200,
    description: 'List of rewards',
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
  @ApiOperation({ summary: 'Get current user rewards' })
  @ApiResponse({
    status: 200,
    description: 'List of user rewards',
    type: [RewardResponseDto],
  })
  async findMyRewards(@CurrentUser('userId') userId: string): Promise<RewardResponseDto[]> {
    return this.rewardService.findByUser(userId);
  }

  @Get('my-streak')
  @ApiOperation({ summary: 'Get current user purchase streak' })
  @ApiResponse({
    status: 200,
    description: 'User streak information',
    type: UserStreakDto,
  })
  async getMyStreak(@CurrentUser('userId') userId: string): Promise<UserStreakDto> {
    return this.rewardService.getUserStreak(userId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get reward statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Reward statistics',
    type: RewardStatsDto,
  })
  async getStats(): Promise<RewardStatsDto> {
    return this.rewardService.getRewardStats();
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get current user reward statistics' })
  @ApiResponse({
    status: 200,
    description: 'User reward statistics',
    type: RewardStatsDto,
  })
  async getMyStats(@CurrentUser('userId') userId: string): Promise<RewardStatsDto> {
    return this.rewardService.getRewardStats(userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get reward by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Reward found',
    type: RewardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Reward not found' })
  async findOne(@Param('id') id: string): Promise<RewardResponseDto> {
    return this.rewardService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update reward (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Reward updated successfully',
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
  @ApiOperation({ summary: 'Claim a reward' })
  @ApiResponse({
    status: 200,
    description: 'Reward claimed successfully',
    type: RewardResponseDto,
  })
  async claimReward(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<RewardResponseDto> {
    // Verify the reward belongs to the current user
    const reward = await this.rewardService.findOne(id);
    if (reward.userId !== userId) {
      throw new Error('You can only claim your own rewards');
    }
    return this.rewardService.claimReward(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete reward (Admin only)' })
  @ApiResponse({ status: 204, description: 'Reward deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rewardService.remove(id);
  }
}
