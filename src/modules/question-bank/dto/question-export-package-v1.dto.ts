import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUESTION_EXPORT_SCHEMA_VERSION } from '../constants/question-import.constants';
import { MAX_OPTIONS } from '../constants/question-option.constants';
import {
  MAX_IMPORT_CURRICULUM_LINKS,
  MAX_IMPORT_TAGS,
} from '../constants/question-import.constants';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionType } from '../enums/question-type.enum';

export class QuestionExportOptionV1Dto {
  @ApiProperty({ example: 'a' })
  @IsString()
  @MaxLength(64)
  exportKey!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsString()
  mediaAssetId!: string | null;
}

export class QuestionExportCurriculumLinkV1Dto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  curriculumId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsString()
  canonicalLessonKey!: string | null;
}

export class QuestionExportPackageV1Dto {
  @ApiProperty({ example: QUESTION_EXPORT_SCHEMA_VERSION })
  @IsInt()
  @Min(1)
  schemaVersion!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceQuestionCode!: string | null;

  @ApiProperty({ example: 'vi-VN' })
  @IsString()
  @MaxLength(32)
  sourceLocale!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  versionNumber!: number;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  prompt!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instruction!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  explanation!: string | null;

  @ApiPropertyOptional({ enum: QuestionDifficulty, nullable: true })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Asset-reference JSON document (schema v1).',
  })
  @IsOptional()
  @IsString()
  promptMediaJson!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Asset-reference JSON document (schema v1).',
  })
  @IsOptional()
  @IsString()
  explanationMediaJson!: string | null;

  @ApiProperty({ type: [QuestionExportOptionV1Dto] })
  @IsArray()
  @ArrayMaxSize(MAX_OPTIONS)
  @ValidateNested({ each: true })
  @Type(() => QuestionExportOptionV1Dto)
  options!: QuestionExportOptionV1Dto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(MAX_OPTIONS)
  @IsString({ each: true })
  correctOptionKeys!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(MAX_IMPORT_TAGS)
  @IsString({ each: true })
  tagCodes!: string[];

  @ApiProperty({ type: [QuestionExportCurriculumLinkV1Dto] })
  @IsArray()
  @ArrayMaxSize(MAX_IMPORT_CURRICULUM_LINKS)
  @ValidateNested({ each: true })
  @Type(() => QuestionExportCurriculumLinkV1Dto)
  curriculumLinks!: QuestionExportCurriculumLinkV1Dto[];
}
