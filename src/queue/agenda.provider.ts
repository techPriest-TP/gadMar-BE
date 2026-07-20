import { Agenda } from '@hokify/agenda';

export const AgendaProvider = {
  provide: 'AGENDA',
  useFactory: async () => {
    const mongoUrl = process.env.MONGO_DB_URL;
    if (!mongoUrl) {
      throw new Error('MONGO_DB_URL is required to start the GadMar email queue');
    }

    const agenda = new Agenda({
      name: 'GadMar Email Worker',
      db: { address: mongoUrl, collection: 'jobs' },
    });

    await agenda.start();
    return agenda;
  },
};
