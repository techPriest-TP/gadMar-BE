import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { IntersectionType } from '@nestjs/swagger';

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}
// Required user data DTO
export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
  @ApiProperty()
  @IsOptional()
  @IsString()
  platform?: string;
}

// Additional employee data
export class AdditionalEmployeeDataDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  adminId: string;

  @ApiProperty()
  @IsString()
  @IsEnum(Gender)
  gender: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}

// Combine them
export class AddEmployeeDTO extends IntersectionType(
  RegisterDto,
  AdditionalEmployeeDataDto,
) {}
