import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Agenda } from '@hokify/agenda';

@Injectable()
export class AgendaService implements OnApplicationShutdown {
  private readonly logger = new Logger(AgendaService.name);
  private agenda?: Agenda;
  private startPromise?: Promise<Agenda>;

  constructor(private readonly configService: ConfigService) {}

  start(): Promise<Agenda> {
    if (!this.startPromise) {
      this.startPromise = this.createAndStart();
    }

    return this.startPromise;
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.agenda) {
      return;
    }

    await this.agenda.stop();
    this.logger.log('Agenda email worker stopped');
  }

  private async createAndStart(): Promise<Agenda> {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    const agenda = new Agenda({
      name: 'GadMar Email Worker',
      db: { address: databaseUrl, collection: 'jobs' },
    });

    await agenda.start();
    this.agenda = agenda;
    this.logger.log('Agenda email worker started');

    return agenda;
  }
}

export const AgendaProvider = {
  provide: 'AGENDA',
  inject: [AgendaService],
  useFactory: (agendaService: AgendaService) => agendaService.start(),
};
