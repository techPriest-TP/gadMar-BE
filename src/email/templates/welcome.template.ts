import BaseEmailTemplate from './base.template';

export const welcomeEmailTemplate = (name: string) =>
  BaseEmailTemplate(
    name,
    `
      <p style="font-size:16px;margin-bottom:16px;">
        Welcome to <strong>Isuna</strong>.
      </p>

      <p style="font-size:15px;margin-bottom:16px;">
        Your account has been successfully created. You can now explore all features
        and manage your activities seamlessly.
      </p>

      <p style="font-size:15px;">
        If you have any questions, our support team is always ready to help.
      </p>
    `,
  );
