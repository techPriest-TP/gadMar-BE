// /** @format */

// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import sgMail, { MailDataRequired } from '@sendgrid/mail';
// import { configs } from '../../utils/config';
// import { ConfigService } from '@nestjs/config';
// const { MAIL_VERIFICATIONID } = configs;

// // sgMail.setApiKey(SENDGRID_APIKEY);

// @Injectable()
// export class SendGridService {
//   private sender = 'developer@techatpurplegate.com';
//   private mailVerfication: string;

//   constructor(private readonly configService: ConfigService) {
//     sgMail.setApiKey(this.configService.get<string>('SENDGRID_APIKEY')!);
//     this.mailVerfication =
//       this.configService.get<string>('MAIL_VERIFICATIONID') ||
//       MAIL_VERIFICATIONID;
//   }

//   async send(params: {
//     email: string;
//     subject: string;
//     text?: string;
//     html?: string;
//   }) {
//     const msg = {
//       to: params.email,
//       from: this.sender,
//       subject: params.subject,
//       ...(params.text && { text: params.text }),
//       ...(params.html && { html: params.html }),
//     };

//     await sgMail.send(msg as MailDataRequired).catch((e: any) => {
//       console.log(e?.message, 'error mail');
//       throw new InternalServerErrorException(
//         e?.message || 'Error sending email',
//       );
//     });
//   }

//   async sendViaTemplate(params: {
//     email: string;
//     subject: string;
//     templateId: string;
//     replacements: Object;
//   }) {
//     const msg: MailDataRequired = {
//       to: params.email,
//       subject: params.subject,
//       from: this.sender,
//       templateId: this.mailVerfication,
//       dynamicTemplateData: {
//         ...params.replacements,
//       },
//     };

//     await sgMail.send(msg).catch((e) => {
//       throw new InternalServerErrorException(
//         e?.message || 'Error sending email',
//       );
//     });
//   }
// }
