import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserWithStatsDto extends UserResponseDto {
  @ApiProperty({ description: 'Total number of transactions' })
  transactionCount: number;

  @ApiProperty({ description: 'Total rewards earned' })
  totalRewards: number;

  @ApiProperty({ description: 'Pending rewards' })
  pendingRewards: number;

  @ApiProperty({ description: 'Current purchase streak' })
  currentStreak: number;
}
