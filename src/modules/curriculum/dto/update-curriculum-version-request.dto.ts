import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCurriculumVersionRequestDto {
  @ApiPropertyOptional({ example: 'Draft label' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;
}
