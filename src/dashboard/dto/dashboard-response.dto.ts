import { ApiProperty } from '@nestjs/swagger';

class DashboardUserDto {
  @ApiProperty({ example: 'user-id' }) id: string;
  @ApiProperty({ example: 'John' }) firstName: string;
  @ApiProperty({ example: 'Doe' }) lastName: string;
  @ApiProperty({ example: 'john@example.com' }) email: string;
  @ApiProperty({ example: '+2348034567890', required: false }) phone?: string;
  @ApiProperty({ example: 'USER' }) role: string;
  @ApiProperty({ example: '2026-09-06T10:00:00.000Z' }) createdAt: Date;
}

class CustomerDashboardCardsDto {
  @ApiProperty({ example: 4 }) totalPurchases: number;
  @ApiProperty({ example: 1 }) pendingPurchases: number;
  @ApiProperty({ example: 1 }) contactedPurchases: number;
  @ApiProperty({ example: 2 }) confirmedPurchases: number;
  @ApiProperty({ example: 0 }) cancelledPurchases: number;
  @ApiProperty({ example: 25200 }) pendingCredits: number;
  @ApiProperty({ example: 25000 }) withdrawableCredits: number;
  @ApiProperty({ example: 5000 }) withdrawalRequestedCredits: number;
  @ApiProperty({ example: 10000 }) withdrawnCredits: number;
  @ApiProperty({ example: 5000 }) pendingWithdrawalAmount: number;
  @ApiProperty({ example: 10000 }) paidWithdrawalAmount: number;
}

class BrandOwnerDashboardCardsDto {
  @ApiProperty({ example: 1 }) totalBrands: number;
  @ApiProperty({ example: 3 }) totalProducts: number;
  @ApiProperty({ example: 3 }) activeProducts: number;
  @ApiProperty({ example: 1 }) pendingPurchaseIntents: number;
  @ApiProperty({ example: 1 }) contactedPurchaseIntents: number;
  @ApiProperty({ example: 2 }) confirmedPurchases: number;
  @ApiProperty({ example: 4000000 }) confirmedSales: number;
  @ApiProperty({ example: 200000 }) expectedCommission: number;
  @ApiProperty({ example: 125000 }) pendingCommissionAmount: number;
  @ApiProperty({ example: 75000 }) paidCommissionAmount: number;
  @ApiProperty({ example: 1 }) pendingConfirmationProofs: number;
}

class AdminDashboardCardsDto {
  @ApiProperty({ example: 4 }) totalUsers: number;
  @ApiProperty({ example: 2 }) customers: number;
  @ApiProperty({ example: 1 }) brandOwners: number;
  @ApiProperty({ example: 3 }) totalBrands: number;
  @ApiProperty({ example: 3 }) verifiedBrands: number;
  @ApiProperty({ example: 0 }) pendingBrandVerifications: number;
  @ApiProperty({ example: 7 }) totalProducts: number;
  @ApiProperty({ example: 7 }) activeProducts: number;
  @ApiProperty({ example: 1 }) pendingPurchaseIntents: number;
  @ApiProperty({ example: 2 }) confirmedPurchases: number;
  @ApiProperty({ example: 2900000 }) confirmedPurchaseVolume: number;
  @ApiProperty({ example: 63000 }) pendingCommissionAmount: number;
  @ApiProperty({ example: 75000 }) paidCommissionAmount: number;
  @ApiProperty({ example: 90200 }) creditLiability: number;
  @ApiProperty({ example: 5000 }) pendingWithdrawalAmount: number;
  @ApiProperty({ example: 0 }) approvedWithdrawalAmount: number;
  @ApiProperty({ example: 1 }) pendingConfirmationProofs: number;
}

class AdminDashboardQueuesDto {
  @ApiProperty({ example: 0 }) brandVerifications: number;
  @ApiProperty({ example: 1 }) confirmationProofs: number;
  @ApiProperty({ example: 5000 }) withdrawals: number;
  @ApiProperty({ example: 63000 }) commissions: number;
}

class DirectConfirmationDto {
  @ApiProperty({ example: 'brand-id' }) brandId: string;
  @ApiProperty({ example: 'Apple' }) brandName: string;
  @ApiProperty({ example: 'VERIFIED' }) verificationStatus: string;
  @ApiProperty({ example: true }) canDirectlyConfirmPurchases: boolean;
}

export class CustomerDashboardResponseDto {
  @ApiProperty({ type: DashboardUserDto }) user: DashboardUserDto;
  @ApiProperty({ type: CustomerDashboardCardsDto })
  cards: CustomerDashboardCardsDto;
  @ApiProperty({ type: [Object] }) recentPurchases: object[];
  @ApiProperty({ type: [Object] }) recentCredits: object[];
  @ApiProperty({ type: [Object] }) recentWithdrawals: object[];
}

export class BrandOwnerDashboardResponseDto {
  @ApiProperty({ type: [Object] }) brands: object[];
  @ApiProperty({ type: BrandOwnerDashboardCardsDto })
  cards: BrandOwnerDashboardCardsDto;
  @ApiProperty({ type: [DirectConfirmationDto] })
  directConfirmation: DirectConfirmationDto[];
  @ApiProperty({ type: [Object] }) recentPurchaseIntents: object[];
  @ApiProperty({ type: [Object] }) recentCommissions: object[];
}

export class AdminDashboardResponseDto {
  @ApiProperty({ example: 'admin-user-id' }) adminUserId: string;
  @ApiProperty({ type: AdminDashboardCardsDto }) cards: AdminDashboardCardsDto;
  @ApiProperty({ type: AdminDashboardQueuesDto })
  queues: AdminDashboardQueuesDto;
  @ApiProperty({ type: [Object] }) recentPurchaseIntents: object[];
  @ApiProperty({ type: [Object] }) recentWithdrawals: object[];
  @ApiProperty({ type: [Object] }) recentBrandRequests: object[];
}
