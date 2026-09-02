import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateExamRequestDto {
  @ApiProperty({ example: 'midterm-2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;
}
