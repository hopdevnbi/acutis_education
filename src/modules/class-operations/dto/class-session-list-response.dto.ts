import { ApiProperty } from '@nestjs/swagger';
import { ClassSessionResponseDto } from './class-session-response.dto';

export class ClassSessionListResponseDto {
  @ApiProperty({ type: [ClassSessionResponseDto] })
  items!: ClassSessionResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
