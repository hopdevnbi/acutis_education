import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ParishStatus } from '../enums/parish-status.enum';

export class UpdateParishStatusRequestDto {
  @ApiProperty({ enum: ParishStatus, example: ParishStatus.Inactive })
  @IsEnum(ParishStatus)
  status!: ParishStatus;
}
