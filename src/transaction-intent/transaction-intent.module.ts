import { Module } from '@nestjs/common';
import { TransactionIntentService } from './transaction-intent.service';
import { TransactionIntentController } from './transaction-intent.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { RewardModule } from '../reward/reward.module';

@Module({
  imports: [WhatsAppModule, ActivityLogModule, RewardModule],
  controllers: [TransactionIntentController],
  providers: [TransactionIntentService],
  exports: [TransactionIntentService],
})
export class TransactionIntentModule {}
