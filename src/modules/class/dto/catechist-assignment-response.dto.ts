import { ApiProperty } from '@nestjs/swagger';
import { CatechistAssignmentRole } from '../enums/catechist-assignment-role.enum';
import { CatechistAssignmentStatus } from '../enums/catechist-assignment-status.enum';

export class CatechistAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ format: 'uuid' })
  catechistUserId!: string;

  @ApiProperty({ enum: CatechistAssignmentRole })
  assignmentRole!: CatechistAssignmentRole;

  @ApiProperty({ enum: CatechistAssignmentStatus })
  status!: CatechistAssignmentStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  assignedAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endedAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
