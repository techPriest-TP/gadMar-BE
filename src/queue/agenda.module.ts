import { Module } from '@nestjs/common';
import { AgendaProvider, AgendaService } from './agenda.provider';
import { MailModule } from '../email/email.module';
import { SendEmailJob } from './jobs/send-email.job';

@Module({
  imports: [MailModule],
  providers: [AgendaService, AgendaProvider, SendEmailJob],
  exports: ['AGENDA'],
})
export class AgendaModule {}
