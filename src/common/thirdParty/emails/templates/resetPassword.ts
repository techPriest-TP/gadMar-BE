/** @format */

import baseEmailTemplate from "./baseTemplate"

const resetPassword = (otp: string) => `
<p>
Your OTP to reset your password is:
</p>

<div align="center" style="background-color:#e8e8f0;padding:1px;border-radius:10px;">
<p class="fw-bold text-center">${otp}</p>
</div>
`

export default function resetPasswordEmail(subject: string, otp: string) {
    return baseEmailTemplate(subject, resetPassword(otp))
}
