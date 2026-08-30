import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CATECHISM_LEVEL_CODE_MAX_LENGTH } from '../utils/catechism-level-code.util';
import { CATECHISM_LEVEL_NAME_MAX_LENGTH } from '../utils/catechism-level-name.util';

export class UpdateCatechismLevelRequestDto {
  @ApiPropertyOptional({ example: 'so-cap-2', maxLength: CATECHISM_LEVEL_CODE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CATECHISM_LEVEL_CODE_MAX_LENGTH)
  code?: string;

  @ApiPropertyOptional({ example: 'Sơ Cấp 2', maxLength: CATECHISM_LEVEL_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CATECHISM_LEVEL_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
