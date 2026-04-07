// /** @format */

// import { catchError } from "../../utils"
// import { configs } from "../../utils/config"
// import twilio from "twilio";
// const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = configs

// const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

// class TwilioService {
//     static async sendSms(to: string, sms: string) {
//         try {
//             const messageData = await client.messages.create({
//                 body: sms,
//                 from: TWILIO_PHONE_NUMBER,
//                 to,
//             })

//             return messageData
//         } catch (error) {
//             throw catchError("Error sending sms", 500)
//         }
//     }
// }

// export default TwilioService
