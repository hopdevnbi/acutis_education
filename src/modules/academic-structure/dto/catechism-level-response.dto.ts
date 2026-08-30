import { ApiProperty } from '@nestjs/swagger';
import { CatechismLevelStatus } from '../enums/catechism-level-status.enum';

export class CatechismLevelResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ example: 'so-cap-1' })
  code!: string;

  @ApiProperty({ example: 'Sơ Cấp 1' })
  name!: string;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty({ enum: CatechismLevelStatus })
  status!: CatechismLevelStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
