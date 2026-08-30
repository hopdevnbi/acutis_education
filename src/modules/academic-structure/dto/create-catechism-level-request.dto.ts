import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { CATECHISM_LEVEL_CODE_MAX_LENGTH } from '../utils/catechism-level-code.util';
import { CATECHISM_LEVEL_NAME_MAX_LENGTH } from '../utils/catechism-level-name.util';

export class CreateCatechismLevelRequestDto {
  @ApiProperty({ example: 'so-cap-1', maxLength: CATECHISM_LEVEL_CODE_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATECHISM_LEVEL_CODE_MAX_LENGTH)
  code!: string;

  @ApiProperty({ example: 'Sơ Cấp 1', maxLength: CATECHISM_LEVEL_NAME_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATECHISM_LEVEL_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ example: 1, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
