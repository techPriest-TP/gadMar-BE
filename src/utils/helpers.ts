import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
// import { ProductCategory } from '@prisma/client';
import * as crypto from 'crypto';
import { Request } from 'express';
// import { customAlphabet } from 'nanoid';

export const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(otp).digest('hex');

export const getClientUrl = (request: Request) => {
  return (
    request.headers.origin || request.get('origin') || process.env.FRONTEND_URL
  );
};

// const generatedIds = new Set<string>();

export const generate = (
  prefix: string = 'LWC',
  suffix: string = 'SER',
  minDigits: number = 5,
  maxAttempts: number = 100,
): string => {
  const maxNumber = Math.pow(10, minDigits) - 1;
  const randomNum = Math.floor(Math.random() * maxNumber) + 1;
  const paddedNumber = randomNum.toString().padStart(minDigits, '0');
  const id = `${prefix}${suffix}${paddedNumber}`;

  return id;
};

// Usage:
// const generator = new TransactionIdGenerator();
// console.log(generator.generate()); // LWCSER001
// console.log(generator.generate()); // LWCSER002 (different)
interface PricingItem {
  // slots: any[];
  duration: number;
}
export const getDurationRange = (pricing: PricingItem[] | undefined) => {
  if (!pricing || pricing.length === 0) {
    return '0 - 0'; // or return null/empty string
  }

  const durations = pricing.map((item) => item.duration);
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  return min === max ? `${min}` : `${min} - ${max}`;
};

/**
 * Generate user code in format LWCUSR00000, LWCUSR00001, etc.
 * @param index - The sequential index
 * @returns Formatted user code string
 */
// export const generateUserCode = (
//   // role?: 'ADMIN' | 'STAFF' | 'USER',
//   platform?: string,
// ): string | null => {
//   if (platform === 'WEB') {
//     return null;
//   } else {
//     const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No ambiguous chars
//     const nanoid = customAlphabet(alphabet, 8);
//     return `LWC-CUS-${nanoid()}`; // Example: LWC5X8JK3R
//   }
// };

export const resolveCapacityUnits = (meta?: any): number => {
  if (!meta) return 1;
  return meta.people ?? meta.seats ?? meta.quantity ?? 1;
};

export function formatDateTime(
  isoString: Date,
  timezone: 'local' | 'utc' = 'local',
): { date: string; time: string } {
  const date = new Date(isoString);

  // Validate the date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid ISO timestamp');
  }

  // Format the date (e.g., "January 13, 2026")
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone === 'utc' ? 'UTC' : undefined,
  });

  // Format the time (e.g., "1:29pm")
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone === 'utc' ? 'UTC' : undefined,
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date),
  };
}

export const formatToLagosISO = (date: Date): string => {
  const offset = 60; // Lagos is UTC + 60 minutes
  const localDate = new Date(date.getTime() + offset * 60 * 1000);
  return localDate.toISOString().replace('Z', '+01:00');
};

// Helper to keep code dry
export const handleError = (error: any, defaultMessage: string) => {
  console.error(error);
  if (
    error instanceof NotFoundException ||
    error instanceof BadRequestException
  ) {
    throw error;
  }
  throw new InternalServerErrorException(defaultMessage);
};
