import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@email.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  otp: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
