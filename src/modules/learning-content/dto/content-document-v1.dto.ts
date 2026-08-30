import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';

export class ContentDocumentV1Dto {
  @ApiProperty({ example: 1 })
  @IsInt()
  schemaVersion!: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    example: [
      { type: 'heading', level: 1, text: 'Introduction to the Sacraments' },
      { type: 'paragraph', text: 'Sacraments are outward signs instituted by Christ.' },
      {
        type: 'bullet_list',
        items: ['Baptism', 'Confirmation', 'Eucharist'],
      },
      {
        type: 'numbered_list',
        items: ['Prepare the lesson', 'Review key terms', 'Close with prayer'],
      },
      {
        type: 'scripture_ref',
        reference: 'John 3:16',
        text: 'For God so loved the world...',
      },
      {
        type: 'callout',
        variant: 'important',
        text: 'Review parish safety guidelines before class.',
      },
      {
        type: 'image_ref',
        assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        alt: 'Altar illustration',
      },
      {
        type: 'video_ref',
        assetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        caption: 'Short introduction video',
      },
    ],
  })
  @IsArray()
  blocks!: Record<string, unknown>[];
}

export class UpsertLessonContentRequestDto {
  @ApiProperty({ type: ContentDocumentV1Dto })
  @ValidateNested()
  @Type(() => ContentDocumentV1Dto)
  document!: ContentDocumentV1Dto;
}

export class LessonContentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  lessonId!: string;

  @ApiProperty({ example: 1 })
  contentSchemaVersion!: number;

  @ApiProperty({ type: ContentDocumentV1Dto })
  document!: ContentDocumentV1Dto;

  @ApiPropertyOptional({
    nullable: true,
    example: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  })
  contentHash!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
