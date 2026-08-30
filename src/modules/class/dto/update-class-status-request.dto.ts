import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ClassStatus } from '../enums/class-status.enum';

const CLASS_STATUS_UPDATE_VALUES = [
  ClassStatus.Active,
  ClassStatus.Completed,
  ClassStatus.Cancelled,
] as const;

export class UpdateClassStatusRequestDto {
  @ApiProperty({ enum: CLASS_STATUS_UPDATE_VALUES })
  @IsEnum(CLASS_STATUS_UPDATE_VALUES)
  @IsNotEmpty()
  status!: (typeof CLASS_STATUS_UPDATE_VALUES)[number];
}
