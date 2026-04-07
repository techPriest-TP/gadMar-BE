// /** @format */

// import { ConflictException } from '@nestjs/common';

// /**
//  * Required environment variables
//  */
// const REQUIRED_ENVS = [
//   'NODE_ENV',
//   'PORT',
//   'ENCRYPTIONIV',
//   'ENCRYPTIONKEY',
//   'MONGO_DB_URL',
//   'SENDGRID_APIKEY',
//   'MAIL_VERIFICATIONID',
//   'POSTMARK_TOKEN',
//   'POSTMARK_URL',
//   'POSTMARK_FROM_EMAIL',
// ] as const;

// /**
//  * Validate required envs AFTER dotenv / ConfigModule has loaded
//  */
// export const validateEnvs = () => {
//   const missing = REQUIRED_ENVS.filter(
//     (key) => !process.env[key] || process.env[key]?.trim() === '',
//   );

//   if (missing.length > 0) {
//     throw new ConflictException(
//       `Missing environment variables: ${missing.join(', ')}`,
//     );
//   }
// };

// /**
//  * Lazy, safe access to env variables
//  */
// const env = (key: string): string => {
//   const value = process.env[key];
//   console.log(`Config load: ${key}=${value ? '****' : 'undefined'}`);
//   if (!value) {
//     throw new ConflictException(`Environment variable ${key} is not set`);
//   }
//   return value;
// };

// /**
//  * Application configuration (lazy getters)
//  */
// export const configs = {
//   get NODE_ENV() {
//     return env('NODE_ENV');
//   },

//   get PORT() {
//     return env('PORT');
//   },

//   get ENCRYPTIONIV() {
//     return env('ENCRYPTIONIV');
//   },

//   get ENCRYPTIONKEY() {
//     return env('ENCRYPTIONKEY');
//   },

//   get MONGO_DB_URL() {
//     return env('MONGO_DB_URL');
//   },

//   get SENDGRID_APIKEY() {
//     return env('SENDGRID_APIKEY');
//   },

//   get MAIL_VERIFICATIONID() {
//     return env('MAIL_VERIFICATIONID');
//   },

//   get POSTMARK_TOKEN() {
//     return env('POSTMARK_TOKEN');
//   },

//   get POSTMARK_URL() {
//     return env('POSTMARK_URL');
//   },

//   get POSTMARK_FROM_EMAIL() {
//     return env('POSTMARK_FROM_EMAIL');
//   },
// };
