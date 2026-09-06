import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ConfirmTransactionIntentDto {
  @ApiProperty({
    example: 250000,
    description:
      'Final amount paid by the customer after WhatsApp negotiation.',
  })
  @IsNumber()
  @Min(0.01)
  finalAmount: number;

  @ApiPropertyOptional({
    example: 'Payment received by transfer. Brand confirmed on dashboard.',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class GenerateConfirmationLinkDto {
  @ApiProperty({
    example: 250000,
    description: 'Final amount the brand says the customer paid.',
  })
  @IsNumber()
  @Min(0.01)
  finalAmount: number;

  @ApiPropertyOptional({
    example: 48,
    default: 72,
    description: 'How long the confirmation link should remain valid.',
  })
  @IsNumber()
  @Min(1)
  @Max(168)
  @IsOptional()
  expiresInHours?: number;

  @ApiPropertyOptional({
    example: 'Share this link with the customer after payment is received.',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class SubmitConfirmationProofDto {
  @ApiProperty({
    example:
      'https://gadmar.com/dashboard/purchases/GAD-1A2B3C4D/confirm?token=abc123',
    description: 'Confirmation link received from the brand after payment.',
  })
  @IsString()
  confirmationLink: string;

  @ApiPropertyOptional({
    example: 'I paid by bank transfer and the brand sent me this link.',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ReviewConfirmationProofDto {
  @ApiPropertyOptional({
    example: 'Payment proof checked with the brand. Purchase confirmed.',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class RejectConfirmationProofDto {
  @ApiProperty({
    example: 'Confirmation link does not match the purchase record.',
  })
  @IsString()
  reason: string;
}
