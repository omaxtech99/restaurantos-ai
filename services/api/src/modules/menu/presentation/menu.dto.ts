import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DIETARY_TAGS } from '@restaurantos/shared';

export class CreateMenuCategoryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  position?: number;
}

export class UpdateMenuCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  position?: number;
}

export class TasteProfileDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(5)
  spicy!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(5)
  sweet!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(5)
  sour!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(5)
  salty!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(5)
  umami!: number;
}

export class NutritionInfoDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(5_000)
  calories!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(500)
  proteinG!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(500)
  carbsG!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(500)
  fatG!: number;
}

export class CreateMenuItemDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  priceCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  position?: number;

  @ApiPropertyOptional({ type: TasteProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TasteProfileDto)
  tasteProfile?: TasteProfileDto;

  @ApiPropertyOptional({ type: NutritionInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionInfoDto)
  nutritionInfo?: NutritionInfoDto;

  @ApiPropertyOptional({ enum: DIETARY_TAGS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DIETARY_TAGS.length)
  @IsIn(DIETARY_TAGS, { each: true })
  dietaryTags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  videoUrl?: string;
}

export class UpdateMenuItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  position?: number;

  @ApiPropertyOptional({ type: TasteProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TasteProfileDto)
  tasteProfile?: TasteProfileDto;

  @ApiPropertyOptional({ type: NutritionInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionInfoDto)
  nutritionInfo?: NutritionInfoDto;

  @ApiPropertyOptional({ enum: DIETARY_TAGS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DIETARY_TAGS.length)
  @IsIn(DIETARY_TAGS, { each: true })
  dietaryTags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  videoUrl?: string;
}

export class AiSuggestDishDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class PresignMediaUploadDto {
  @ApiProperty({ enum: ['photo', 'video'] })
  @IsIn(['photo', 'video'])
  kind!: 'photo' | 'video';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  contentType!: string;
}
