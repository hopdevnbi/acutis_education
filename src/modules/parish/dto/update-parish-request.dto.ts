import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateParishRequestDto {
  @ApiPropertyOptional({ example: 'giao-xu-moi', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'Giáo xứ Mới', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ example: 'vi-VN', maxLength: 32, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  defaultLocale?: string | null;
}
