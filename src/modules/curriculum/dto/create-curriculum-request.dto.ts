import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCurriculumRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  catechismLevelId!: string;

  @ApiProperty({ example: 'khai-tam' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Giáo lý Khai Tâm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ example: 'Chương trình giáo lý cơ bản' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiProperty({
    example: 'vi-VN',
    description: 'BCP 47-like source locale for curriculum lineage.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  sourceLocale!: string;
}
