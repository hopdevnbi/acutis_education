import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGlossaryDraftRequestDto {
  @ApiProperty({ example: 'vi-VN', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  sourceLocale!: string;

  @ApiProperty({ example: 'en-US', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  targetLocale!: string;
}

export class CloneGlossaryDraftRequestDto {
  @ApiProperty({ example: 'vi-VN', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  sourceLocale!: string;

  @ApiProperty({ example: 'en-US', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  targetLocale!: string;
}

export class AddGlossaryTermRequestDto {
  @ApiProperty({ example: 'Thiên Chúa', maxLength: 256 })
  @IsString()
  @MaxLength(256)
  sourceTerm!: string;

  @ApiProperty({ example: 'God', maxLength: 256 })
  @IsString()
  @MaxLength(256)
  targetTerm!: string;

  @ApiPropertyOptional({ example: 'Capitalized divine name', maxLength: 512, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string | null;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean;
}

export class UpdateGlossaryTermRequestDto {
  @ApiPropertyOptional({ example: 'Chúa Giêsu', maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  sourceTerm?: string;

  @ApiPropertyOptional({ example: 'Jesus Christ', maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  targetTerm?: string;

  @ApiPropertyOptional({ example: 'Proper name', maxLength: 512, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean;
}
