import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RewardType, RewardStatus } from '@prisma/client';

export class UpdateRewardDto {
  @ApiProperty({ example: 'PURCHASE_STREAK', description: 'Reward type', enum: RewardType, required: false })
  @IsEnum(RewardType)
  @IsOptional()
  type?: RewardType;

  @ApiProperty({ example: 3000, description: 'Reward amount', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({ example: 'CLAIMED', description: 'Reward status', enum: RewardStatus, required: false })
  @IsEnum(RewardStatus)
  @IsOptional()
  status?: RewardStatus;

  @ApiProperty({ example: '3 purchase streak reward', description: 'Reward description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Reward expiry date', required: false })
  @IsOptional()
  expiresAt?: Date;
}
