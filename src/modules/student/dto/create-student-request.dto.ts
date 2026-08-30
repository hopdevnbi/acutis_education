import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateStudentRequestDto {
  @ApiProperty({ example: 'Nguyễn Văn An', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  fullName!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Optional link to an existing active user account.',
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID('4')
  userId?: string | null;
}
