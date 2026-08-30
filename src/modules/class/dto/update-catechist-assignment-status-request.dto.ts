import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CatechistAssignmentStatus } from '../enums/catechist-assignment-status.enum';

export class UpdateCatechistAssignmentStatusRequestDto {
  @ApiProperty({ enum: [CatechistAssignmentStatus.Ended] })
  @IsIn([CatechistAssignmentStatus.Ended])
  status!: CatechistAssignmentStatus.Ended;
}
