import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class UpdateEnrollmentStatusRequestDto {
  @ApiProperty({ enum: [EnrollmentStatus.Completed, EnrollmentStatus.Withdrawn] })
  @IsIn([EnrollmentStatus.Completed, EnrollmentStatus.Withdrawn])
  status!: EnrollmentStatus.Completed | EnrollmentStatus.Withdrawn;
}
