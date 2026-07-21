import { ApiProperty } from '@nestjs/swagger';
import { NigerianRegion } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Oico Techs' })
  @IsString()
  name: string;

  @ApiProperty({ required: false }) @IsUrl() @IsOptional() logo?: string;
  @ApiProperty({ required: false }) @IsUrl() @IsOptional() banner?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() about?: string;
  @ApiProperty({ example: '+2348012345678' }) @IsString() phone: string;
  @ApiProperty({ example: 'https://wa.me/2348012345678' }) @IsUrl() whatsappLink: string;
  @ApiProperty({ required: false }) @IsEmail() @IsOptional() email?: string;
  @ApiProperty({ required: false }) @IsUrl() @IsOptional() websiteUrl?: string;
  @ApiProperty({ type: [String], required: false }) @IsArray() @IsUrl({}, { each: true }) @IsOptional() socialLinks?: string[];
  @ApiProperty({ required: false }) @IsString() @IsOptional() warrantyPolicy?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() returnsPolicy?: string;
  @ApiProperty({ enum: NigerianRegion, required: false }) @IsEnum(NigerianRegion) @IsOptional() region?: NigerianRegion;
  @ApiProperty({ required: false }) @IsString() @IsOptional() state?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() lga?: string;
  @ApiProperty({ type: [String], required: false }) @IsArray() @IsString({ each: true }) @IsOptional() deliveryStates?: string[];
  @ApiProperty({ type: [String], required: false }) @IsArray() @IsString({ each: true }) @IsOptional() pickupLocations?: string[];
  @ApiProperty({ type: [String], required: false }) @IsArray() @IsString({ each: true }) @IsOptional() inspectionLocations?: string[];
  @ApiProperty({ required: false }) @IsBoolean() @IsOptional() nationwideDelivery?: boolean;
  @ApiProperty({ required: false, description: 'Admin may assign a brand owner' }) @IsString() @IsOptional() ownerId?: string;
}
