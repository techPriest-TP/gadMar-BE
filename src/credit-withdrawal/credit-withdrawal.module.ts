import { Module } from '@nestjs/common';
import { CreditWithdrawalController } from './credit-withdrawal.controller';
import { CreditWithdrawalService } from './credit-withdrawal.service';

@Module({
  controllers: [CreditWithdrawalController],
  providers: [CreditWithdrawalService],
})
export class CreditWithdrawalModule {}
