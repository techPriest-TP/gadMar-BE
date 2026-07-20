import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BrandModule } from './brand/brand.module';
import { ProductModule } from './product/product.module';
import { TransactionIntentModule } from './transaction-intent/transaction-intent.module';
import { RewardModule } from './reward/reward.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { CommissionModule } from './commission/commission.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { validateEnvironment } from './config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Caching
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes default
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UserModule,
    BrandModule,
    ProductModule,
    TransactionIntentModule,
    RewardModule,
    ActivityLogModule,
    AnalyticsModule,
    WhatsAppModule,
    CommissionModule,
  ],
})
export class AppModule {}
