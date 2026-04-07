import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';

export class ActivityLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ActivityType })
  type: ActivityType;

  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ required: false })
  productId?: string;

  @ApiProperty({ required: false })
  brandId?: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
  ipAddress?: string;

  @ApiProperty({ required: false })
  userAgent?: string;

  @ApiProperty()
  createdAt: Date;
}

export class ActivityStatsDto {
  @ApiProperty()
  totalActivities: number;

  @ApiProperty()
  productViews: number;

  @ApiProperty()
  whatsappClicks: number;

  @ApiProperty()
  brandViews: number;

  @ApiProperty()
  searches: number;

  @ApiProperty()
  uniqueUsers: number;
}
