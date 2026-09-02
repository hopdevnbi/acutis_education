import { ApiProperty } from '@nestjs/swagger';
import { ClassStatus } from '../../class/enums/class-status.enum';
import type {
  CatechistPortalClassListSnapshot,
  CatechistPortalClassSummarySnapshot,
} from '../interfaces/catechist-portal.interface';

export class CatechistClassSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty()
  className!: string;

  @ApiProperty()
  classCode!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ format: 'uuid' })
  academicYearId!: string;

  @ApiProperty({ format: 'uuid' })
  catechismLevelId!: string;

  @ApiProperty({ enum: ClassStatus })
  classStatus!: ClassStatus;

  @ApiProperty()
  activeEnrollmentCount!: number;
}

export class CatechistClassListResponseDto {
  @ApiProperty({ type: [CatechistClassSummaryResponseDto] })
  items!: CatechistClassSummaryResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

function toCatechistClassSummaryResponseDto(
  snapshot: CatechistPortalClassSummarySnapshot,
): CatechistClassSummaryResponseDto {
  return {
    classId: snapshot.classId,
    className: snapshot.className,
    classCode: snapshot.classCode,
    parishId: snapshot.parishId,
    academicYearId: snapshot.academicYearId,
    catechismLevelId: snapshot.catechismLevelId,
    classStatus: snapshot.classStatus,
    activeEnrollmentCount: snapshot.activeEnrollmentCount,
  };
}

export function toCatechistClassListResponseDto(
  snapshot: CatechistPortalClassListSnapshot,
): CatechistClassListResponseDto {
  return {
    items: snapshot.items.map(toCatechistClassSummaryResponseDto),
    page: snapshot.page,
    limit: snapshot.limit,
    total: snapshot.total,
    totalPages: snapshot.totalPages,
  };
}
