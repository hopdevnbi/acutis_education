import { ApiProperty } from '@nestjs/swagger';
import { CurriculumVersionResponseDto } from './curriculum-version-response.dto';

export class CurriculumVersionListResponseDto {
  @ApiProperty({ type: [CurriculumVersionResponseDto] })
  items!: CurriculumVersionResponseDto[];
}
