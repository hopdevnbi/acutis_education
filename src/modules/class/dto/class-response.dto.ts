import { ApiProperty } from '@nestjs/swagger';
import { ClassStatus } from '../enums/class-status.enum';

export class ClassResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ format: 'uuid' })
  academicYearId!: string;

  @ApiProperty({ format: 'uuid' })
  catechismLevelId!: string;

  @ApiProperty({ example: 'khai-tam-a' })
  code!: string;

  @ApiProperty({ example: 'Lớp Khai Tâm A' })
  name!: string;

  @ApiProperty({ enum: ClassStatus })
  status!: ClassStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
