import { ApiProperty } from '@nestjs/swagger';
import { ParishStatus } from '../enums/parish-status.enum';

export class ParishResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'giao-xu-thanh-gia' })
  code!: string;

  @ApiProperty({ example: 'Giáo xứ Thánh Gia' })
  name!: string;

  @ApiProperty({ enum: ParishStatus })
  status!: ParishStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
