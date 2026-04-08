import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RegisterTokenDTO {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class UnRegisterTokenDTO {
  @ApiProperty()
  @IsString()
  token: string;
}

export class BroadCastDTO {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;
}
