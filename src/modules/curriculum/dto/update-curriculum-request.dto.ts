import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCurriculumRequestDto {
  @ApiPropertyOptional({ example: 'khai-tam' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'Giáo lý Khai Tâm' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  sourceLocale?: string;
}
