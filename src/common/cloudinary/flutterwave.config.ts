// flutterwave.config.ts
export const FLW_CONFIG = {
  clientId: process.env.FLW_CLIENT_ID!,
  clientSecret: process.env.FLW_CLIENT_SECRET!,
  encryptionKey: process.env.FLW_ENCRYPTION_KEY!,
  env: process.env.FLW_ENV === 'production' ? 'production' : 'sandbox',
  baseUrl:
    process.env.FLW_ENV === 'production'
      ? 'https://f4bexperience.flutterwave.com'
      : 'https://developersandbox-api.flutterwave.com',
};
