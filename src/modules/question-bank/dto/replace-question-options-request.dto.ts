import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_OPTIONS, MIN_OPTIONS } from '../constants/question-option.constants';
import { QUESTION_OPTION_TEXT_MAX_LENGTH } from '../utils/question-option-text.util';

export class ReplaceQuestionOptionItemDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(QUESTION_OPTION_TEXT_MAX_LENGTH)
  text?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  mediaAssetId?: string | null;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  sortOrder!: number;
}

export class ReplaceQuestionOptionsRequestDto {
  @ApiProperty({ type: [ReplaceQuestionOptionItemDto] })
  @IsArray()
  @ArrayMinSize(MIN_OPTIONS)
  @ArrayMaxSize(MAX_OPTIONS)
  @ValidateNested({ each: true })
  @Type(() => ReplaceQuestionOptionItemDto)
  items!: ReplaceQuestionOptionItemDto[];
}
