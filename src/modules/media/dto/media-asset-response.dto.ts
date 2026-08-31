import { ApiProperty } from '@nestjs/swagger';
import { MediaAssetStatus } from '../enums/media-asset-status.enum';
import { MediaCategory } from '../enums/media-category.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

export class MediaAssetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'lesson-photo.jpg' })
  originalFileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ enum: MediaCategory })
  mediaCategory!: MediaCategory;

  @ApiProperty({ example: 1024 })
  sizeBytes!: number;

  @ApiProperty({ example: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' })
  checksumSha256!: string;

  @ApiProperty({ enum: MediaAssetStatus })
  status!: MediaAssetStatus;

  @ApiProperty({ enum: MediaVisibility })
  visibility!: MediaVisibility;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
