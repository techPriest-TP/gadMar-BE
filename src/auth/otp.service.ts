import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenType } from '@prisma/client';
import { EmailJobType, SendEmailJob } from 'src/queue/jobs/send-email.job';
import { PrismaService } from '../prisma/prisma.service';
import { generateOtp, hashOtp } from '../utils/helpers';
import { resetPasswordTemplate } from 'src/email/templates/reset-password.template';
import { Agenda } from '@hokify/agenda';
import { otpEmailTemplate } from 'src/email/templates/otp.template';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('AGENDA') private readonly agenda: Agenda,
  ) {}

  private OTP_EXPIRY_MINUTES = 10;
  private MAX_REQUESTS = 3;

  async requestOtp(email: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new BadRequestException('User not found');

      // Rate limiting (last 10 minutes)
      const recentOtps = await this.prisma.authToken.count({
        where: {
          userId: user.id,
          type: AuthTokenType.EMAIL_OTP,
          createdAt: {
            gt: new Date(Date.now() - 10 * 60 * 1000),
          },
        },
      });

      if (recentOtps >= this.MAX_REQUESTS) {
        throw new BadRequestException(
          'Too many OTP requests. Please try again later.',
        );
      }

      // Invalidate previous unused OTPs
      await this.prisma.authToken.deleteMany({
        where: {
          userId: user.id,
          type: AuthTokenType.EMAIL_OTP,
          usedAt: null,
        },
      });

      const otp = generateOtp();

      await this.prisma.authToken.create({
        data: {
          userId: user.id,
          type: AuthTokenType.EMAIL_OTP,
          tokenHash: hashOtp(otp),
          expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000),
        },
      });

      console.log('starting agenda for sending OTP...');

      // Queue email
      await this.agenda.now(EmailJobType.SEND, {
        to: user.email,
        subject: 'Your Verification Code',
        html: otpEmailTemplate(user.firstName, otp),
        tag: 'OTP_EMAIL',
      });

      return { message: 'OTP sent successfully', success: true };
    } catch (error) {
      throw error;
    }
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid OTP');

    const token = await this.prisma.authToken.findFirst({
      where: {
        userId: user.id,
        type: AuthTokenType.EMAIL_OTP,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token || token.tokenHash !== hashOtp(otp)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.authToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    if (!user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    return { message: 'OTP verified successfully', success: true };
  }
}
