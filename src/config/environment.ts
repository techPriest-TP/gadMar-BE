const REQUIRED_ENVIRONMENT_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'POSTMARK_URL',
  'POSTMARK_TOKEN',
  'POSTMARK_FROM_EMAIL',
] as const;

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

  for (const secret of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if ((environment[secret] as string).length < 32) {
      throw new Error(`${secret} must contain at least 32 characters`);
    }
  }

  return environment;
}
