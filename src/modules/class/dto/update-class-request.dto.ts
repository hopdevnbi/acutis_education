import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClassRequestDto {
  @ApiPropertyOptional({ example: 'khai-tam-b', maxLength: 32 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'Lớp Khai Tâm B', maxLength: 128 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name?: string;
}
