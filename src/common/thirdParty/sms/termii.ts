// /** @format */

// import axios from "axios"
// import { catchError } from "../../utils"
// import { configs } from "../../utils/config"
// const { TERMII_APIKEY, TERMII_BASEURL, TERMII_SENDER } = configs

// class TermiiService {
//     private static channel: "dnd" | "generic" | "whatsapp" = "generic"

//     private static http = axios.create({
//         baseURL: TERMII_BASEURL,
//         timeout: 15000000,
//         headers: {
//             Accept: "application/json",
//             "Content-Type": "application/json",
//         },
//     })

//     static async sendSms(to: string, sms: string, channel = this.channel) {
//         const { data } = await this.http
//             .post("sms/send", {
//                 to,
//                 sms,
//                 channel,
//                 type: "plain",
//                 from: TERMII_SENDER,
//                 api_key: TERMII_APIKEY,
//             })
//             .catch(e => {
//                 throw catchError(
//                     e?.response?.data?.message || "Error sending sms",
//                     500
//                 )
//             })
//         return data
//     }
// }

// export default TermiiService
