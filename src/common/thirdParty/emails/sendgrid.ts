// /** @format */

// import sgMail, { MailDataRequired } from "@sendgrid/mail"
// import { catchError } from "../../utils"
// import { configs } from "../../utils/config"
// const { SENGRID_APIKEY, MAIL_VERIFICATIONID } = configs

// sgMail.setApiKey(SENGRID_APIKEY);

// class SendGridService {
//     private static sender = "developer@techatpurplegate.com"

//     static async send(params: {
//         email: string
//         subject: string
//         text?: string
//         html?: string
//     }) {
//         const msg = {
//             // to: params.email,
//             from: this.sender,
//             subject: params.subject,
//             ...(params.text && { text: params.text }),
//             ...(params.html && { html: params.html }),
//         }

//         await sgMail.send(msg as MailDataRequired).catch(e => {
//             console.log(e?.message,"error mail")
//             throw catchError(e?.message || "Error sending email", 500)
//         })
//     }

//     static async sendViaTemplate(params: {
//         email: string
//         subject: string
//         templateId: string
//         replacements: Object
//     }) {
//         const msg: MailDataRequired = {
//             to: params.email,
//             subject: params.subject,
//             from: this.sender,
//             templateId: MAIL_VERIFICATIONID,
//             dynamicTemplateData: {
//                 ...params.replacements,
//             },
//         }

//         await sgMail.send(msg).catch(e => {
//             throw catchError(e?.message || "Error sending email", 500)
//         })
//     }
// }

// export default SendGridService
