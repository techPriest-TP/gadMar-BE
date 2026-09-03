const REQUIRED_ENVIRONMENT_VARIABLES = [
  'APP_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'CLOUD_NAME',
  'CLOUD_KEY',
  'CLOUD_SECRET',
  'CLOUDINARY_UPLOAD_PRESET',
] as const;

const EMAIL_PROVIDER_VARIABLES = {
  postmark: ['POSTMARK_URL', 'POSTMARK_TOKEN', 'POSTMARK_FROM_EMAIL'],
  resend: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
} as const;

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter((key) => {
    const value = environment[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const appEnvironment = String(environment.APP_ENV).toLowerCase();
  if (!['development', 'production'].includes(appEnvironment)) {
    throw new Error('APP_ENV must be either development or production');
  }
  environment.APP_ENV = appEnvironment;

  if (appEnvironment === 'development') {
    return validateSecrets(environment);
  }

  const emailProvider = String(
    environment.EMAIL_PROVIDER || 'postmark',
  ).toLowerCase();
  if (!(emailProvider in EMAIL_PROVIDER_VARIABLES)) {
    throw new Error('EMAIL_PROVIDER must be either postmark or resend');
  }

  environment.EMAIL_PROVIDER = emailProvider;
  const providerVariables =
    EMAIL_PROVIDER_VARIABLES[
      emailProvider as keyof typeof EMAIL_PROVIDER_VARIABLES
    ];
  const missingProviderVariables = providerVariables.filter((key) => {
    const value = environment[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });
  if (missingProviderVariables.length > 0) {
    throw new Error(
      `Missing required ${emailProvider} environment variables: ${missingProviderVariables.join(', ')}`,
    );
  }

  return validateSecrets(environment);
}

function validateSecrets(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  for (const secret of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if ((environment[secret] as string).length < 32) {
      throw new Error(`${secret} must contain at least 32 characters`);
    }
  }

  return environment;
}
