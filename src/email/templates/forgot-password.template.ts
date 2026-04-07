import BaseEmailTemplate from './base.template';

export const forgotPasswordTemplate = (name: string, resetLink: string) =>
  BaseEmailTemplate(
    name,
    `
      <p style="font-size:16px;margin-bottom:16px;">
        We received a request to reset your password.
      </p>

      <p style="margin:24px 0;">
        <a
          href="${resetLink}"
          style="
            display:inline-block;
            padding:12px 24px;
            background:#0867ec;
            color:#ffffff;
            text-decoration:none;
            border-radius:6px;
            font-weight:600;
          "
        >
          Reset Password
        </a>
      </p>

      <p style="font-size:15px;">
        This link will expire soon for security reasons.
      </p>
    `,
  );
