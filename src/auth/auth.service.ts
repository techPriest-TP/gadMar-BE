import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from './auth.controller';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        password: await bcrypt.hash(dto.password, 12),
        role: UserRole.USER,
      },
    });

    return {
      message: 'Account created successfully',
      user: this.toSafeUser(user),
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      return null;
    }
    return user;
  }

  async login(user: User, platform?: Platform) {
    if (platform === Platform.WEB && user.role === UserRole.USER) {
      throw new UnauthorizedException('Customers cannot sign in to the administration dashboard');
    }

    const tokens = await this.generateTokens(user);
    return {
      success: true,
      message: 'Login successful',
      data: { user: this.toSafeUser(user), ...tokens },
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password || !(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(dto.newPassword, 12) },
    });
    return { message: 'Password changed successfully', success: true };
  }

  async generateTokens(user: User) {
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
    });
    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<{ userId: string }>(
        refreshToken,
        { secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
      const user = await this.prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user?.refreshToken || !(await bcrypt.compare(refreshToken, user.refreshToken))) {
        throw new UnauthorizedException();
      }
      return { message: 'Token refreshed successfully', ...(await this.generateTokens(user)) };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) await this.otpService.requestOtp(email);
    return { message: 'If the account exists, a verification code has been sent' };
  }

  async resetPassword(otp: string, newPassword: string, email: string) {
    await this.otpService.verifyOtp(email, otp);
    await this.prisma.user.update({
      where: { email },
      data: { password: await bcrypt.hash(newPassword, 12), refreshToken: null },
    });
  }

  private toSafeUser(user: User) {
    const { password, refreshToken, ...safeUser } = user;
    return safeUser;
  }
}
