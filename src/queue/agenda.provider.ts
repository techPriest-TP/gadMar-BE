import { Agenda } from '@hokify/agenda';
import { ConfigService } from '@nestjs/config';

export const AgendaProvider = {
  provide: 'AGENDA',
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');

    const agenda = new Agenda({
      name: 'GadMar Email Worker',
      db: { address: databaseUrl, collection: 'jobs' },
    });

    await agenda.start();
    return agenda;
  },
};
