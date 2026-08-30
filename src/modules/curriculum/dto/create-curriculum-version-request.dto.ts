import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCurriculumVersionRequestDto {
  @ApiPropertyOptional({ example: '2026 refresh' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;
}
