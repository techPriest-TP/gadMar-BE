import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CloudinaryWebhookDto {
  @ApiProperty() @IsString() public_id: string;
  @ApiProperty() @IsString() asset_id: string;
  @ApiProperty({ example: 'upload' }) @IsString() type: string;
  @ApiProperty({ example: 'image' }) @IsString() resource_type: string;
  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  secure_url: string;
  @ApiProperty() @IsInt() @Min(1) width: number;
  @ApiProperty() @IsInt() @Min(1) height: number;
  @ApiProperty() @IsString() format: string;
  @ApiProperty() @IsInt() @Min(1) bytes: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notification_type?: string;
}
