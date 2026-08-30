import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpsertCurriculumAssignmentRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  curriculumVersionId!: string;
}
