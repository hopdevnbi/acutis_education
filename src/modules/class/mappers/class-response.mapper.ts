import { ClassListResponseDto } from '../dto/class-list-response.dto';
import { ClassResponseDto } from '../dto/class-response.dto';
import type { ClassSnapshot, ListClassesResult } from '../interfaces/class.interface';

export function toClassResponseDto(snapshot: ClassSnapshot): ClassResponseDto {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    academicYearId: snapshot.academicYearId,
    catechismLevelId: snapshot.catechismLevelId,
    code: snapshot.code,
    name: snapshot.name,
    status: snapshot.status,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toClassListResponseDto(result: ListClassesResult): ClassListResponseDto {
  return {
    items: result.items.map(toClassResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
