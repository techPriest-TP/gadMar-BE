import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword#2025' })
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: 'NewPassword#2025' })
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
