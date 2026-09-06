import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConfirmationProofStatus,
  TransactionConfirmationSource,
  TransactionStatus,
} from '@prisma/client';

export class TransactionIntentItemResponseDto {
  @ApiProperty() productId: string;
  @ApiProperty() productName: string;
  @ApiProperty() productSlug: string;
  @ApiPropertyOptional() productImage?: string;
  @ApiProperty() unitPrice: number;
  @ApiProperty() quantity: number;
  @ApiProperty() rewardEligible: boolean;
}

export class TransactionIntentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() batchId: string;
  @ApiPropertyOptional() userId?: string;
  @ApiProperty() brandId: string;
  @ApiProperty({ enum: TransactionStatus }) status: TransactionStatus;
  @ApiProperty() refCode: string;
  @ApiProperty() amount: number;
  @ApiPropertyOptional() finalAmount?: number;
  @ApiPropertyOptional({ enum: TransactionConfirmationSource })
  confirmationSource?: TransactionConfirmationSource;
  @ApiPropertyOptional() confirmedById?: string;
  @ApiPropertyOptional() confirmationNote?: string;
  @ApiPropertyOptional() confirmationLinkGeneratedById?: string;
  @ApiPropertyOptional() confirmationLinkGeneratedAt?: Date;
  @ApiPropertyOptional() confirmationLinkExpiresAt?: Date;
  @ApiProperty() whatsappMessage: string;
  @ApiProperty() whatsappUrl: string;
  @ApiPropertyOptional() contactedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class TransactionIntentWithDetailsDto extends TransactionIntentResponseDto {
  @ApiProperty({ type: [TransactionIntentItemResponseDto] })
  items: TransactionIntentItemResponseDto[];
  @ApiProperty() brand: { id: string; name: string; whatsappLink: string };
  @ApiPropertyOptional({
    type: () => [TransactionConfirmationProofResponseDto],
  })
  confirmationProofs?: TransactionConfirmationProofResponseDto[];
}

export class TransactionConfirmationProofResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() transactionId: string;
  @ApiProperty() userId: string;
  @ApiProperty() confirmationLink: string;
  @ApiProperty() finalAmount: number;
  @ApiProperty({ enum: ConfirmationProofStatus })
  status: ConfirmationProofStatus;
  @ApiPropertyOptional() note?: string;
  @ApiPropertyOptional() reviewedById?: string;
  @ApiPropertyOptional() reviewedAt?: Date;
  @ApiPropertyOptional() reviewNote?: string;
  @ApiPropertyOptional() rejectionReason?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PurchaseBatchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() batchCode: string;
  @ApiPropertyOptional() userId?: string;
  @ApiPropertyOptional() guestName?: string;
  @ApiPropertyOptional() guestPhone?: string;
  @ApiPropertyOptional() guestEmail?: string;
  @ApiProperty({ type: [TransactionIntentWithDetailsDto] })
  intents: TransactionIntentWithDetailsDto[];
  @ApiProperty() createdAt: Date;
}
