import BaseEmailTemplate from './base.template';

export const otpEmailTemplate = (name: string, otp: string) =>
  BaseEmailTemplate(
    name,
    `
      <p style="font-size:16px;margin-bottom:16px;">
        Use the verification code below to complete your action:
      </p>

      <div style="
        font-size:28px;
        font-weight:700;
        letter-spacing:4px;
        text-align:center;
        margin:24px 0;
      ">
        ${otp}
      </div>

      <p style="font-size:15px;">
        This code will expire shortly. Do not share it with anyone.
      </p>
    `,
  );
