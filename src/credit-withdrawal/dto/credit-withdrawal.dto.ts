import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditWithdrawalStatus } from '@prisma/client';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCreditWithdrawalDto {
  @ApiProperty({
    example: 5000,
    description:
      'Amount of available GadMar Credits the customer wants to withdraw.',
  })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ example: 'GTBank' })
  @IsString()
  @MaxLength(80)
  bankName: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @MaxLength(20)
  accountNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(120)
  accountName: string;

  @ApiPropertyOptional({ example: 'Please pay this into my savings account.' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

export class ReviewCreditWithdrawalDto {
  @ApiPropertyOptional({
    example: 'Bank details reviewed. Approved for payout.',
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

export class RejectCreditWithdrawalDto {
  @ApiProperty({
    example: 'Account number could not be verified.',
  })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class MarkCreditWithdrawalPaidDto {
  @ApiPropertyOptional({
    example: 'TRF-20260906-0001',
    description: 'Bank transfer or payout reference used by admin.',
  })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({
    example: 'Paid via manual bank transfer.',
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

export class CreditWithdrawalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: CreditWithdrawalStatus })
  status: CreditWithdrawalStatus;
  @ApiProperty() bankName: string;
  @ApiProperty() accountNumber: string;
  @ApiProperty() accountName: string;
  @ApiPropertyOptional() note?: string;
  @ApiPropertyOptional() reviewedById?: string;
  @ApiPropertyOptional() reviewedAt?: Date;
  @ApiPropertyOptional() reviewNote?: string;
  @ApiPropertyOptional() rejectionReason?: string;
  @ApiPropertyOptional() paidById?: string;
  @ApiPropertyOptional() paidAt?: Date;
  @ApiPropertyOptional() paymentReference?: string;
  @ApiProperty({ type: [String] })
  rewardIds: string[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
