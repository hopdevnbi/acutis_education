import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionExportPackageV1Dto } from './question-export-package-v1.dto';

export type ImportValidationSeverity = 'ERROR' | 'WARNING';

export class ImportValidationIssueDto {
  @ApiProperty({ example: 'TAG_NOT_FOUND' })
  code!: string;

  @ApiPropertyOptional({ example: 'tagCodes/0' })
  path?: string;

  @ApiProperty({ example: 'Tag code "faith" was not found in this parish.' })
  message!: string;

  @ApiProperty({ enum: ['ERROR', 'WARNING'] })
  severity!: ImportValidationSeverity;
}

export class QuestionImportValidationResponseDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty({ type: [ImportValidationIssueDto] })
  issues!: ImportValidationIssueDto[];

  @ApiPropertyOptional({ type: QuestionExportPackageV1Dto })
  normalizedPreview?: QuestionExportPackageV1Dto;
}
