import { Module } from '@nestjs/common';
import { TransactionIntentService } from './transaction-intent.service';
import { TransactionIntentController } from './transaction-intent.controller';

@Module({
  controllers: [TransactionIntentController],
  providers: [TransactionIntentService],
  exports: [TransactionIntentService],
})
export class TransactionIntentModule {}
