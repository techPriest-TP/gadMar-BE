import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { ActivityLogResponseDto, ActivityStatsDto } from './dto/activity-log-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, ActivityType } from '@prisma/client';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a new activity' })
  @ApiResponse({
    status: 201,
    description: 'Activity logged successfully',
    type: ActivityLogResponseDto,
  })
  async create(
    @Body() createDto: CreateActivityLogDto,
    @Req() request: Request,
    @CurrentUser('userId') userId?: string,
  ): Promise<ActivityLogResponseDto> {
    // Use authenticated user ID if available
    if (userId && !createDto.userId) {
      createDto.userId = userId;
    }

    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    return this.activityLogService.create(createDto, ipAddress, userAgent);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all activity logs (Admin only)' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'productId', required: false, type: String, description: 'Filter by product ID' })
  @ApiQuery({ name: 'brandId', required: false, type: String, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'type', required: false, enum: ActivityType, description: 'Filter by activity type' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Skip N records' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Take N records' })
  @ApiResponse({
    status: 200,
    description: 'List of activity logs',
    type: [ActivityLogResponseDto],
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('productId') productId?: string,
    @Query('brandId') brandId?: string,
    @Query('type') type?: ActivityType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ActivityLogResponseDto[]> {
    return this.activityLogService.findAll({
      userId,
      productId,
      brandId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get activity statistics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Activity statistics',
    type: ActivityStatsDto,
  })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ActivityStatsDto> {
    return this.activityLogService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('product/:productId/stats')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get product activity statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back' })
  @ApiResponse({
    status: 200,
    description: 'Product activity statistics',
  })
  async getProductStats(
    @Param('productId') productId: string,
    @Query('days') days?: string,
  ) {
    return this.activityLogService.getProductViewStats(
      productId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('brand/:brandId/stats')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get brand activity statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look back' })
  @ApiResponse({
    status: 200,
    description: 'Brand activity statistics',
  })
  async getBrandStats(
    @Param('brandId') brandId: string,
    @Query('days') days?: string,
  ) {
    return this.activityLogService.getBrandActivityStats(
      brandId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('my-activity')
  @ApiOperation({ summary: 'Get current user activity logs' })
  @ApiResponse({
    status: 200,
    description: 'List of user activity logs',
    type: [ActivityLogResponseDto],
  })
  async findMyActivity(
    @CurrentUser('userId') userId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ActivityLogResponseDto[]> {
    return this.activityLogService.findAll({
      userId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
