import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';

export class CurriculumVersionListQueryDto {
  @ApiPropertyOptional({ enum: CurriculumVersionStatus })
  @IsOptional()
  @IsEnum(CurriculumVersionStatus)
  status?: CurriculumVersionStatus;
}
