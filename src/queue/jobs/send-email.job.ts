import { Inject, Injectable } from '@nestjs/common';
import { Agenda } from '@hokify/agenda';
import { MailService } from 'src/email/email.service';

export enum EmailJobType {
  SEND = 'SEND_EMAIL',
}

@Injectable()
export class SendEmailJob {
  constructor(
    @Inject('AGENDA') private readonly agenda: Agenda,
    private readonly mailService: MailService,
  ) {
    this.define();
  }

  private define() {
    this.agenda.define(EmailJobType.SEND, async (job) => {
      const { to, subject, html, tag } = job.attrs.data;
      await this.mailService.sendEmail({ to, subject, html, tag });
      await job.remove();
    });
  }
}
