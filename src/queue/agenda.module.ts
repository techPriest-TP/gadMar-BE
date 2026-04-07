import { Module } from '@nestjs/common';
import { AgendaProvider } from './agenda.provider';
import { MailModule } from '../email/email.module';
import { SendEmailJob } from './jobs/send-email.job';
import { ExpireBookingsJob } from './jobs/expire-bookings.job';
import { AutoSlotGeneratorJob } from './jobs/auto-slot-generator.job';
import { EventSlotGeneratorJob } from './jobs/event-slot-generator.job';
import { AdminSlotService } from 'src/product-slots/service';

@Module({
  imports: [MailModule],
  providers: [
    AgendaProvider,
    SendEmailJob,
    ExpireBookingsJob,
    AutoSlotGeneratorJob,
    EventSlotGeneratorJob,
    AdminSlotService,
  ],
  exports: ['AGENDA'],
})
export class AgendaModule {}
