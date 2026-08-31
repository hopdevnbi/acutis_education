import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  questionVersionId!: string;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiPropertyOptional({ nullable: true })
  text!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class QuestionOptionListResponseDto {
  @ApiProperty({ type: [QuestionOptionResponseDto] })
  items!: QuestionOptionResponseDto[];
}
