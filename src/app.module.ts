import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
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
import { MediaModule } from './media/media.module';
import { CreditWithdrawalModule } from './credit-withdrawal/credit-withdrawal.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

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
    MediaModule,
    TransactionIntentModule,
    RewardModule,
    ActivityLogModule,
    AnalyticsModule,
    WhatsAppModule,
    CommissionModule,
    CreditWithdrawalModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
