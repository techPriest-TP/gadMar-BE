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
import { TransactionIntentService } from './transaction-intent.service';
import { CreateTransactionIntentDto } from './dto/create-transaction-intent.dto';
import { UpdateTransactionIntentDto } from './dto/update-transaction-intent.dto';
import {
  TransactionIntentResponseDto,
  TransactionIntentWithDetailsDto,
} from './dto/transaction-intent-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, TransactionStatus } from '@prisma/client';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transaction-intents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionIntentController {
  constructor(private readonly transactionService: TransactionIntentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transaction intent' })
  @ApiResponse({
    status: 201,
    description: 'Transaction intent created successfully',
    type: TransactionIntentWithDetailsDto,
  })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createDto: CreateTransactionIntentDto,
  ): Promise<TransactionIntentWithDetailsDto> {
    return this.transactionService.create(userId, createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get all transaction intents' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'brandId', required: false, type: String, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Skip N records' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Take N records' })
  @ApiResponse({
    status: 200,
    description: 'List of transaction intents',
    type: [TransactionIntentWithDetailsDto],
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: TransactionStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<TransactionIntentWithDetailsDto[]> {
    return this.transactionService.findAllWithDetails({
      userId,
      brandId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('my-transactions')
  @ApiOperation({ summary: 'Get current user transactions' })
  @ApiResponse({
    status: 200,
    description: 'List of user transactions',
    type: [TransactionIntentResponseDto],
  })
  async findMyTransactions(
    @CurrentUser('userId') userId: string,
  ): Promise<TransactionIntentResponseDto[]> {
    return this.transactionService.findByUser(userId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get transaction statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Transaction statistics',
  })
  async getStats() {
    return this.transactionService.getStats();
  }

  @Get('ref/:refCode')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get transaction by reference code' })
  @ApiResponse({
    status: 200,
    description: 'Transaction found',
    type: TransactionIntentWithDetailsDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findByRefCode(@Param('refCode') refCode: string): Promise<TransactionIntentWithDetailsDto> {
    return this.transactionService.findByRefCode(refCode);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Get transaction intent by ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction found',
    type: TransactionIntentWithDetailsDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@Param('id') id: string): Promise<TransactionIntentWithDetailsDto> {
    return this.transactionService.findOneWithDetails(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({ summary: 'Update transaction intent' })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated successfully',
    type: TransactionIntentResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionIntentDto,
  ): Promise<TransactionIntentResponseDto> {
    return this.transactionService.update(id, updateDto);
  }

  @Post(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction completed successfully',
    type: TransactionIntentResponseDto,
  })
  async completeTransaction(
    @Param('id') id: string,
    @Query('amount') amount?: string,
  ): Promise<TransactionIntentResponseDto> {
    return this.transactionService.completeTransaction(
      id,
      amount ? parseFloat(amount) : undefined,
    );
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction cancelled successfully',
    type: TransactionIntentResponseDto,
  })
  async cancelTransaction(@Param('id') id: string): Promise<TransactionIntentResponseDto> {
    return this.transactionService.cancelTransaction(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transaction intent (Admin only)' })
  @ApiResponse({ status: 204, description: 'Transaction deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.transactionService.remove(id);
  }
}
