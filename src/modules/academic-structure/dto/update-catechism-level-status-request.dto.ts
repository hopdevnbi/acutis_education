import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CatechismLevelStatus } from '../enums/catechism-level-status.enum';

export class UpdateCatechismLevelStatusRequestDto {
  @ApiProperty({ enum: CatechismLevelStatus, example: CatechismLevelStatus.Inactive })
  @IsEnum(CatechismLevelStatus)
  status!: CatechismLevelStatus;
}
