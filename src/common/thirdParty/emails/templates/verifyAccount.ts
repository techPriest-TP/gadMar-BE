/** @format */

import baseEmailTemplate from "./baseTemplate"

const verificationMessage = (otp: string) => `
<p>
Hey there! Thanks for joining Isuna, here is your OTP:
</p>

<div align="center" style="background-color:#e8e8f0;padding:1px;border-radius:10px;">
<p class="fw-bold text-center">${otp}</p>
</div>
`

export default function verifyAccountEmail(subject: string, otp: string) {
    return baseEmailTemplate(subject, verificationMessage(otp))
}
