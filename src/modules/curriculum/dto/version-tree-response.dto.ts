import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurriculumVersionResponseDto } from './curriculum-version-response.dto';

export class VersionTreeLessonResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  canonicalLessonKey!: string;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  estimatedDurationMinutes!: number | null;
}

export class VersionTreeTopicResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [VersionTreeLessonResponseDto] })
  lessons!: VersionTreeLessonResponseDto[];
}

export class VersionTreeResponseDto {
  @ApiProperty({ type: CurriculumVersionResponseDto })
  version!: CurriculumVersionResponseDto;

  @ApiProperty({ type: [VersionTreeTopicResponseDto] })
  topics!: VersionTreeTopicResponseDto[];
}
