import { EnrollmentListResponseDto } from '../dto/enrollment-list-response.dto';
import { EnrollmentResponseDto } from '../dto/enrollment-response.dto';
import type { EnrollmentSnapshot, ListEnrollmentsResult } from '../interfaces/enrollment.interface';

export function toEnrollmentResponseDto(snapshot: EnrollmentSnapshot): EnrollmentResponseDto {
  return {
    id: snapshot.id,
    studentId: snapshot.studentId,
    classId: snapshot.classId,
    parishId: snapshot.parishId,
    academicYearId: snapshot.academicYearId,
    status: snapshot.status,
    enrolledAt: snapshot.enrolledAt.toISOString(),
    leftAt: snapshot.leftAt === null ? null : snapshot.leftAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toEnrollmentListResponseDto(
  result: ListEnrollmentsResult,
): EnrollmentListResponseDto {
  return {
    items: result.items.map(toEnrollmentResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
