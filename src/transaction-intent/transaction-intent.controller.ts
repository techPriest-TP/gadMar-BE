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
import {
  ConfirmationProofStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
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
import {
  ConfirmTransactionIntentDto,
  GenerateConfirmationLinkDto,
  RejectConfirmationProofDto,
  ReviewConfirmationProofDto,
  SubmitConfirmationProofDto,
} from './dto/confirmation-flow.dto';

@ApiBearerAuth()
@Controller('transaction-intents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionIntentController {
  constructor(private readonly service: TransactionIntentService) {}

  @Post()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Public Website', 'Customer Dashboard')
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
  @ApiTags('Public Website', 'Customer Dashboard')
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
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
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
  @ApiTags('Customer Dashboard')
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
  @ApiTags('Super Admin Dashboard')
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

  @Get('confirmation-proofs')
  @Roles(UserRole.ADMIN)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'List customer-submitted purchase confirmation proofs',
    description:
      'Admin review queue for confirmation links submitted by customers from their dashboard.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ConfirmationProofStatus,
    description: 'Filter proof review queue by status.',
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
  @ApiResponse({
    status: 200,
    description: 'Confirmation proofs with related purchase intent details.',
  })
  findConfirmationProofs(
    @Query('status') status?: ConfirmationProofStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findConfirmationProofs({
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Post('confirmation-proofs/:proofId/approve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Approve a customer confirmation proof',
    description:
      'Approves the submitted proof, confirms the purchase, creates the commission, and issues pending GadMar Credits.',
  })
  @ApiParam({ name: 'proofId', description: 'Confirmation proof ID.' })
  @ApiResponse({
    status: 200,
    description: 'Confirmation proof approved and purchase confirmed.',
  })
  approveConfirmationProof(
    @Param('proofId') proofId: string,
    @Body() dto: ReviewConfirmationProofDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.approveConfirmationProof(proofId, dto, user);
  }

  @Post('confirmation-proofs/:proofId/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Super Admin Dashboard')
  @ApiOperation({
    summary: 'Reject a customer confirmation proof',
    description:
      'Rejects a submitted confirmation proof without confirming the purchase or issuing credits.',
  })
  @ApiParam({ name: 'proofId', description: 'Confirmation proof ID.' })
  @ApiResponse({
    status: 200,
    description: 'Confirmation proof rejected.',
  })
  rejectConfirmationProof(
    @Param('proofId') proofId: string,
    @Body() dto: RejectConfirmationProofDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.rejectConfirmationProof(proofId, dto, user);
  }

  @Get('ref/:refCode')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
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
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
  @ApiOperation({ summary: 'Get a purchase intent by ID' })
  @ApiParam({
    name: 'id',
    description: 'Purchase intent ID.',
  })
  @ApiResponse({ status: 200, type: TransactionIntentWithDetailsDto })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.findOneWithDetails(id, user);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
  @ApiOperation({
    summary: 'Confirm a WhatsApp purchase directly',
    description:
      'Brand owners can confirm purchases for their own brands. Admins can confirm any purchase. Confirmation creates a pending commission and pending customer credits when eligible.',
  })
  @ApiParam({ name: 'id', description: 'Purchase intent ID.' })
  @ApiResponse({
    status: 200,
    description:
      'Purchase confirmed with commission and credit records created.',
    type: TransactionIntentWithDetailsDto,
  })
  confirmDirect(
    @Param('id') id: string,
    @Body() dto: ConfirmTransactionIntentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.confirmDirect(id, dto, user);
  }

  @Post(':id/confirmation-link')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
  @ApiOperation({
    summary: 'Generate a customer confirmation link',
    description:
      'Used when the brand sends a payment confirmation link to the customer. The customer can submit the link from their dashboard for admin review.',
  })
  @ApiParam({ name: 'id', description: 'Purchase intent ID.' })
  @ApiResponse({
    status: 201,
    description: 'Customer confirmation link generated.',
    schema: {
      example: {
        transactionId: 'transaction-intent-id',
        refCode: 'GAD-1A2B3C4D',
        confirmationLink:
          'https://gadmar.com/dashboard/purchases/GAD-1A2B3C4D/confirm?token=abc123',
        finalAmount: 250000,
        expiresAt: '2026-09-08T10:00:00.000Z',
      },
    },
  })
  generateConfirmationLink(
    @Param('id') id: string,
    @Body() dto: GenerateConfirmationLinkDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.generateConfirmationLink(id, dto, user);
  }

  @Post(':id/proofs')
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Customer Dashboard')
  @ApiOperation({
    summary: 'Submit a purchase confirmation link for admin review',
    description:
      'Customer submits the brand-generated confirmation link. Admin approval is required before the purchase becomes confirmed.',
  })
  @ApiParam({ name: 'id', description: 'Purchase intent ID.' })
  @ApiResponse({
    status: 201,
    description: 'Confirmation proof submitted for admin review.',
  })
  submitConfirmationProof(
    @Param('id') id: string,
    @Body() dto: SubmitConfirmationProofDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.submitConfirmationProof(id, dto, userId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiTags('Brand Owner Dashboard', 'Super Admin Dashboard')
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
  @ApiTags('Super Admin Dashboard')
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
