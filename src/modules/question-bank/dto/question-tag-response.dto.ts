import { ApiProperty } from '@nestjs/swagger';
import { QuestionTagStatus } from '../enums/question-tag-status.enum';

export class QuestionTagResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: QuestionTagStatus })
  status!: QuestionTagStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
