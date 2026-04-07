// /** @format */

// import { Agenda } from '@hokify/agenda';
// import { configs } from 'src/utils/config';
// import { sendNotification } from './jobs/notification';
// // import { sendSms } from "./jobs/sms"

// const agenda = new Agenda({
//   name: 'Lagos Water Craft',
//   defaultConcurrency: 10,
//   db: { address: configs.MONGO_DB_URL, collection: 'jobs' },
// });

// agenda
//   .on('ready', () => console.log('Agenda started!'))
//   .on('error', (err: Error) =>
//     console.log('Agenda connection error!', err?.message),
//   );

// const definitions = [sendNotification] as any[];

// definitions.forEach((definition: any) => definition(agenda));

// export default agenda;
