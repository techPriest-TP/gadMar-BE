import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { Agenda } from '@hokify/agenda';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateUserCode } from 'src/utils/helpers';
import { Platform } from './auth.controller';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  private TOKEN_EXPIRY_MINUTES = 10;
  private MAX_REQUESTS = 3;
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
    @Inject('AGENDA') private readonly agenda: Agenda,
  ) {}

  async register(registerDto: RegisterDto) {
    const { firstName, lastName, email, phoneNumber, password } = registerDto;
    // let nextUserCode: string | null = '';
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // const lastUser = (await this.prisma.user.findFirst({
    //   where: {
    //     code: {
    //       startsWith: 'LWCUSR',
    //     },
    //   },
    //   orderBy: {
    //     code: 'desc',
    //   },
    //   select: {
    //     code: true,
    //   },
    // })) as {
    //   code: string;
    // };

    // if (!lastUser?.code) {
    //   // No existing codes, start from 0
    //   nextUserCode = generateUserCode(0);
    // }

    // // Extract the number from the last code and increment
    // const lastNumber = parseInt(lastUser.code.replace('LWCUSR', ''), 10);
    const userCode = generateUserCode(registerDto.platform);
    // Create user
    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber,
        password: hashedPassword,
        code: userCode,
        isActive: true,
        // ...(role && { role }),
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    // console.log('entering otp service...');
    // await this.otpService.requestOtp(email);
    // console.log('leaving otp service...');

    return {
      message: 'Account created successfully',
      user: userWithoutPassword,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      // include: { wallet: true },
    });

    if (user && (await bcrypt.compare(password, user.password!))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User, platform?: Platform) {
    console.log('login: ', platform);
    if (platform && platform === 'dashboard' && user.role === 'USER')
      throw new UnauthorizedException("This user can't login here!");
    const { accessToken, refreshToken } = await this.generateTokens(user);

    const userData = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    // Extract keys: ["services.view", "events.create", ...]
    const flatPermissions = userData?.roles.flatMap((userRole) =>
      userRole.role.permissions.map((rp) => rp.permission.key),
    );

    // if (user.role === 'USER') await this.otpService.requestOtp(user.email);
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          role: user.role,
          gender: user.gender,
          permissions: Array.from(new Set(flatPermissions)), // Remove duplicates
          // pin: user.pin,
        },
        accessToken,
        refreshToken,
      },
    };
  }

  // 🧹 logout clears the refresh token
  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const matches = await bcrypt.compare(currentPassword, user.password!);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRounds = 12;
    const hashed = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully', success: true };
  }

  public async generateTokens(user: User) {
    const payload = { userId: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    //  Hash the refresh token before saving
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: payload.userId },
      data: { refreshToken: hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }

  // refresh token handler
  async refreshTokens(refreshToken: string) {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('User or token not found');
      }

      //  Compare hashed tokens
      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      //  Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // silent fail (security)

    // Rate limit: 1 every 5 minutes
    // const recent = await this.prisma.authToken.count({
    //   where: {
    //     userId: user.id,
    //     createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
    //   },
    // });

    // if (recent >= this.MAX_REQUESTS) {
    //   throw new BadRequestException('Please wait before requesting again');
    // }
    // console.log('delete previous...');
    // console.log('authtokentype: ', AuthTokenType.PASSWORD_RESET);
    // Invalidate previous unused OTPs
    // await this.prisma.authToken.deleteMany({
    //   where: {
    //     userId: user.id,
    //     type: AuthTokenType.PASSWORD_RESET,
    //     usedAt: null,
    //   },
    // });

    // const token = crypto.randomBytes(32).toString('hex');
    // const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // console.log('create authtoken...');
    // await this.prisma.authToken.create({
    //   data: {
    //     userId: user.id,
    //     tokenHash,
    //     type: AuthTokenType.PASSWORD_RESET,
    //     expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000),
    //   },
    // });

    // const link = `${origin}/reset-password?token=${token}`;
    return await this.otpService.requestOtp(email);

    // Queue email
    // await this.agenda.now(EmailJobType.SEND, {
    //   to: user.email,
    //   subject: 'Password Reset Request',
    //   html: forgotPasswordTemplate(user.firstName, link),
    //   tag: 'FORGOT_PASSWORD_EMAIL',
    // });
  }

  async resetPassword(otp: string, newPassword: string, email: string) {
    await this.otpService.verifyOtp(email, otp);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { email },
      data: { password: passwordHash },
    });
  }
  // async resetPassword(token: string, newPassword: string) {
  //   const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  //   console.log({ token, tokenHash });

  //   const record = await this.prisma.authToken.findFirst({
  //     where: {
  //       tokenHash,
  //       usedAt: null,
  //       expiresAt: { gt: new Date() },
  //     },
  //     include: {
  //       user: {
  //         select: { email: true },
  //       },
  //     },
  //   });

  //   if (!record) {
  //     throw new BadRequestException('Invalid or expired token');
  //   }

  //   const passwordHash = await bcrypt.hash(newPassword, 12);

  //   await this.prisma.$transaction([
  //     this.prisma.user.update({
  //       where: { email: record.user.email },
  //       data: { password: passwordHash },
  //     }),
  //     this.prisma.authToken.update({
  //       where: { id: record.id },
  //       data: { usedAt: new Date() },
  //     }),
  //   ]);
  // }
}
