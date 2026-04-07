import BaseTemplate from './base.template';

export const resetPasswordTemplate = (name: string, link: string) =>
  BaseTemplate(
    name,
    `Click the link below to reset your password:<br /><a href="${link}">${link}</a>`,
  );
