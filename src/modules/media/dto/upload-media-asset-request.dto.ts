import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MediaCategory } from '../enums/media-category.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

export class UploadMediaAssetRequestDto {
  @ApiProperty({
    enum: MediaCategory,
    example: MediaCategory.Image,
    description: 'Declared media category for the uploaded file.',
  })
  @IsEnum(MediaCategory)
  intendedCategory!: MediaCategory;

  @ApiPropertyOptional({
    enum: MediaVisibility,
    default: MediaVisibility.Private,
    description: 'Only PRIVATE uploads are accepted in the current API.',
  })
  @IsOptional()
  @IsEnum(MediaVisibility)
  visibility?: MediaVisibility;
}
