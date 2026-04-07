import { Agenda } from '@hokify/agenda';
// import { configs } from 'src/utils/config';

export const AgendaProvider = {
  provide: 'AGENDA',
  useFactory: async () => {
    const agenda = new Agenda({
      name: 'Lagos Water-craft Email Worker',
      db: { address: process.env.MONGO_DB_URL, collection: 'jobs' },
    });

    await agenda.start();
    return agenda;
  },
};
