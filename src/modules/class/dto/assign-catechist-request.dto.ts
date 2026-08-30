import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { CatechistAssignmentRole } from '../enums/catechist-assignment-role.enum';

export class AssignCatechistRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  catechistUserId!: string;

  @ApiProperty({ enum: CatechistAssignmentRole })
  @IsEnum(CatechistAssignmentRole)
  assignmentRole!: CatechistAssignmentRole;
}
