import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateEnrollmentRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  studentId!: string;
}
