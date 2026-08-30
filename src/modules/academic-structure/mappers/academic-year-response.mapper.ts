import { AcademicYearListResponseDto } from '../dto/academic-year-list-response.dto';
import { AcademicYearResponseDto } from '../dto/academic-year-response.dto';
import type {
  AcademicYearSnapshot,
  ListAcademicYearsResult,
} from '../interfaces/academic-year.interface';

export function toAcademicYearResponseDto(snapshot: AcademicYearSnapshot): AcademicYearResponseDto {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    name: snapshot.name,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    status: snapshot.status,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

export function toAcademicYearListResponseDto(
  result: ListAcademicYearsResult,
): AcademicYearListResponseDto {
  return {
    items: result.items.map(toAcademicYearResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
