import { StudentListResponseDto } from '../dto/student-list-response.dto';
import { StudentResponseDto } from '../dto/student-response.dto';
import type { ListStudentsResult, StudentSnapshot } from '../interfaces/student.interface';

export function toStudentResponseDto(snapshot: StudentSnapshot): StudentResponseDto {
  return {
    id: snapshot.id,
    userId: snapshot.userId,
    fullName: snapshot.fullName,
    status: snapshot.status,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toStudentListResponseDto(result: ListStudentsResult): StudentListResponseDto {
  return {
    items: result.items.map(toStudentResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
