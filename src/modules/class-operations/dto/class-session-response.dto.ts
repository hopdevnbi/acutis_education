import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassSessionStatus } from '../enums/class-session-status.enum';

export class ClassSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  classId!: string;

  @ApiProperty()
  parishId!: string;

  @ApiProperty()
  academicYearId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ enum: ClassSessionStatus })
  status!: ClassSessionStatus;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  cancelledAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  completedAt!: Date | null;

  @ApiProperty()
  rosterCount!: number;

  @ApiProperty()
  markedCount!: number;

  @ApiProperty()
  unmarkedCount!: number;
}
