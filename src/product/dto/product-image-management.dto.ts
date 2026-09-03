import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { ProductImageInputDto } from './create-product.dto';

export class AddProductImageDto extends ProductImageInputDto {}

export class ReplaceProductImageDto extends ProductImageInputDto {}

export class UpdateProductImageDto {
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  altText?: string | null;
}

export class ReorderProductImagesDto {
  @ApiProperty({
    type: [String],
    description: 'Every image ID on the product, in the desired order',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsMongoId({ each: true })
  imageIds: string[];
}
