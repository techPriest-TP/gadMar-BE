// /** @format */

// import { Agenda } from '@hokify/agenda';
// import { queueDefinition } from '../constant';
// import { SendGridService } from 'src/common/services/Sendgrid.service';
// import resetPasswordEmail from '../../thirdParty/emails/templates/resetPassword';
// import baseEmailTemplate from '../../thirdParty/emails/templates/baseTemplate';
// import Postmark from '../../thirdParty/emails/postmark';
// import PostmarkTemplate from '../../thirdParty/emails/templates/postmarkTemplate';

// export const sendNotification = async (agenda: Agenda) => {
//   agenda.define(queueDefinition.SEND_NOTIFICATION, async (job, done) => {
//     const data = job.attrs.data;
//     const { notificationType, email, emailType, emailSubject, emailBody } =
//       data;
//     if (notificationType === 'email') {
//       let html = '';
//       if (emailType === 'reset-password') {
//         html = resetPasswordEmail(emailSubject, emailBody);
//         await SendGridService.send({
//           email,
//           subject: emailSubject,
//           html,
//         }).catch((e) => {
//           job.fail(new Error(e));
//           job.repeatAt('in 5 seconds');
//         });
//       } else {
//         html = baseEmailTemplate(emailSubject, emailBody);
//         await SendGridService.send({
//           email,
//           subject: emailSubject,
//           html,
//         }).catch((e) => {
//           job.fail(new Error(e));
//           job.repeatAt('in 5 seconds');
//         });
//       }
//     }

//     await job.remove();
//     done();
//   });
// };

// // export const sendToAdmins = async (agenda: Agenda) => {
// //   agenda.define(queueDefinition.SEND_TO_ADMINS, async (job, done) => {
// //     const { admins, message, subject } = job.attrs.data;
// //     admins?.forEach(async (item: { email: string; firstName: string }) => {
// //       const body = PostmarkTemplate(item.firstName, message);
// //       await new Postmark().send(item.email, 'email-notify', subject, body);
// //     });

// //     await job.remove();
// //     done();
// //   });
// // };
