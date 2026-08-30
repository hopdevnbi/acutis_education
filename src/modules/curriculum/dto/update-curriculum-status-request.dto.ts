import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CurriculumStatus } from '../enums/curriculum-status.enum';

export class UpdateCurriculumStatusRequestDto {
  @ApiProperty({ enum: CurriculumStatus })
  @IsEnum(CurriculumStatus)
  status!: CurriculumStatus;
}
