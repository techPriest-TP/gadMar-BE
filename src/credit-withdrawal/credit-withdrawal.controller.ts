import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreditWithdrawalStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreditWithdrawalService } from './credit-withdrawal.service';
import {
  CreateCreditWithdrawalDto,
  CreditWithdrawalResponseDto,
  MarkCreditWithdrawalPaidDto,
  RejectCreditWithdrawalDto,
  ReviewCreditWithdrawalDto,
} from './dto/credit-withdrawal.dto';

@ApiBearerAuth()
@Controller('credit-withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditWithdrawalController {
  constructor(private readonly service: CreditWithdrawalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Request a GadMar Credits withdrawal',
    description:
      'Reserves AVAILABLE credits for admin review so the same credits cannot be withdrawn twice.',
  })
  @ApiResponse({ status: 201, type: CreditWithdrawalResponseDto })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCreditWithdrawalDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get('my-withdrawals')
  @ApiTags('Customer Dashboard')
  @ApiOperation({ summary: 'List current customer withdrawal requests' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, type: [CreditWithdrawalResponseDto] })
  findMine(
    @CurrentUser('userId') userId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findMine(userId, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'List all GadMar Credits withdrawal requests' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CreditWithdrawalStatus })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, type: [CreditWithdrawalResponseDto] })
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: CreditWithdrawalStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll({
      userId,
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @ApiTags('Customer Dashboard', 'Super Admin Dashboard')
  @ApiOperation({ summary: 'Get a withdrawal request by ID' })
  @ApiParam({ name: 'id', description: 'Credit withdrawal ID.' })
  @ApiResponse({ status: 200, type: CreditWithdrawalResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.findOne(id, user);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({ summary: 'Approve a pending withdrawal request' })
  @ApiParam({ name: 'id', description: 'Credit withdrawal ID.' })
  @ApiResponse({ status: 200, type: CreditWithdrawalResponseDto })
  approve(
    @Param('id') id: string,
    @Body() dto: ReviewCreditWithdrawalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.approve(id, dto, user);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Reject a withdrawal request and release reserved credits',
  })
  @ApiParam({ name: 'id', description: 'Credit withdrawal ID.' })
  @ApiResponse({ status: 200, type: CreditWithdrawalResponseDto })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectCreditWithdrawalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.reject(id, dto, user);
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Mark an approved withdrawal as paid',
    description:
      'Moves reserved credit entries from WITHDRAWAL_REQUESTED to WITHDRAWN.',
  })
  @ApiParam({ name: 'id', description: 'Credit withdrawal ID.' })
  @ApiResponse({ status: 200, type: CreditWithdrawalResponseDto })
  markPaid(
    @Param('id') id: string,
    @Body() dto: MarkCreditWithdrawalPaidDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.markPaid(id, dto, user);
  }
}
