import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  STUDENT_LIST_DEFAULT_LIMIT,
  STUDENT_LIST_DEFAULT_PAGE,
  STUDENT_LIST_MAX_LIMIT,
  STUDENT_SORT_DIRECTIONS,
  STUDENT_SORT_FIELDS,
} from '../constants/student.constants';
import { StudentStatus } from '../enums/student-status.enum';

export class StudentListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: STUDENT_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = STUDENT_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: STUDENT_LIST_MAX_LIMIT,
    default: STUDENT_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(STUDENT_LIST_MAX_LIMIT)
  limit: number = STUDENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: STUDENT_SORT_FIELDS, default: 'fullName' })
  @IsOptional()
  @IsIn([...STUDENT_SORT_FIELDS])
  sortBy: (typeof STUDENT_SORT_FIELDS)[number] = 'fullName';

  @ApiPropertyOptional({ enum: STUDENT_SORT_DIRECTIONS, default: 'ASC' })
  @IsOptional()
  @IsIn([...STUDENT_SORT_DIRECTIONS])
  sort: (typeof STUDENT_SORT_DIRECTIONS)[number] = 'ASC';

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ description: 'Case-insensitive search on student full name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}

export class ParishStudentListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: STUDENT_LIST_DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = STUDENT_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: STUDENT_LIST_MAX_LIMIT,
    default: STUDENT_LIST_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(STUDENT_LIST_MAX_LIMIT)
  limit: number = STUDENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ enum: ['fullName', 'createdAt'], default: 'fullName' })
  @IsOptional()
  @IsIn(['fullName', 'createdAt'])
  sortBy: 'fullName' | 'createdAt' = 'fullName';

  @ApiPropertyOptional({ enum: STUDENT_SORT_DIRECTIONS, default: 'ASC' })
  @IsOptional()
  @IsIn([...STUDENT_SORT_DIRECTIONS])
  sort: (typeof STUDENT_SORT_DIRECTIONS)[number] = 'ASC';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive search on student full name.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
