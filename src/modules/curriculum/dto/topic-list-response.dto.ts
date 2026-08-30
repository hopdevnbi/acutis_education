import { ApiProperty } from '@nestjs/swagger';
import { TopicResponseDto } from './topic-response.dto';

export class TopicListResponseDto {
  @ApiProperty({ type: [TopicResponseDto] })
  items!: TopicResponseDto[];
}
