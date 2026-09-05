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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransactionStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTransactionIntentDto } from './dto/create-transaction-intent.dto';
import {
  PurchaseBatchResponseDto,
  TransactionIntentWithDetailsDto,
} from './dto/transaction-intent-response.dto';
import { UpdateTransactionIntentDto } from './dto/update-transaction-intent.dto';
import { TransactionIntentService } from './transaction-intent.service';

@ApiTags('Purchase Intents')
@ApiBearerAuth()
@Controller('transaction-intents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionIntentController {
  constructor(private readonly service: TransactionIntentService) {}

  @Post()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create purchase intents from a cart',
    description:
      'Creates one batch and splits its products into one tracked WhatsApp intent per brand. Supports guests and signed-in users.',
  })
  @ApiResponse({ status: 201, type: PurchaseBatchResponseDto })
  create(
    @CurrentUser() user: RequestUser | undefined,
    @Body() dto: CreateTransactionIntentDto,
  ) {
    return this.service.create(user?.userId, dto);
  }

  @Post('ref/:refCode/whatsapp')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Record a WhatsApp continuation and return its pre-filled URL',
  })
  @ApiParam({
    name: 'refCode',
    example: 'GAD-1A2B3C4D',
    description: 'Purchase intent reference code generated at checkout.',
  })
  @ApiResponse({
    status: 201,
    description: 'WhatsApp continuation recorded',
    schema: {
      example: {
        whatsappUrl: 'https://wa.me/2348012345678?text=Hello...',
      },
    },
  })
  trackWhatsApp(
    @Param('refCode') refCode: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.trackWhatsApp(refCode, user?.userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({
    summary:
      'List purchase intents visible to the current admin or brand owner',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter purchase intents by customer user ID.',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    type: String,
    description: 'Filter purchase intents by brand ID.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TransactionStatus,
    description: 'Filter purchase intents by lifecycle status.',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination.',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return for pagination.',
  })
  @ApiResponse({ status: 200, type: [TransactionIntentWithDetailsDto] })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('userId') userId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: TransactionStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAllWithDetails(
      {
        userId,
        brandId,
        status,
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
      },
      user,
    );
  }

  @Get('my-transactions')
  @ApiOperation({
    summary:
      'List the current user’s purchase batches, including each brand-specific intent',
  })
  @ApiResponse({ status: 200, type: [PurchaseBatchResponseDto] })
  findMine(@CurrentUser('userId') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get purchase-intent statistics' })
  @ApiResponse({
    status: 200,
    description: 'Purchase-intent statistics',
    schema: {
      example: {
        total: 25,
        pending: 8,
        contacted: 10,
        confirmed: 7,
        totalSales: 3500000,
      },
    },
  })
  getStats() {
    return this.service.getStats();
  }

  @Get('ref/:refCode')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get a purchase intent by reference' })
  @ApiParam({
    name: 'refCode',
    example: 'GAD-1A2B3C4D',
    description: 'Purchase intent reference code generated at checkout.',
  })
  @ApiResponse({ status: 200, type: TransactionIntentWithDetailsDto })
  findByRef(
    @Param('refCode') refCode: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findByRefCode(refCode, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get a purchase intent by ID' })
  @ApiParam({
    name: 'id',
    description: 'Purchase intent ID.',
  })
  @ApiResponse({ status: 200, type: TransactionIntentWithDetailsDto })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.findOneWithDetails(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiParam({
    name: 'id',
    description: 'Purchase intent ID.',
  })
  @ApiOperation({
    summary: 'Advance or close a purchase intent',
    description:
      'Enforces the purchase lifecycle. CONFIRMED requires finalAmount and automatically records commission and reward eligibility.',
  })
  @ApiResponse({ status: 200, type: TransactionIntentWithDetailsDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or confirmation amount',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionIntentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a purchase intent' })
  @ApiParam({
    name: 'id',
    description: 'Purchase intent ID.',
  })
  @ApiResponse({ status: 204, description: 'Purchase intent deleted' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
