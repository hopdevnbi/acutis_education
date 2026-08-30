import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { StudentStatus } from '../enums/student-status.enum';

export class UpdateStudentRequestDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn An', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  fullName?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Set to null to unlink the user account.',
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID('4')
  userId?: string | null;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
