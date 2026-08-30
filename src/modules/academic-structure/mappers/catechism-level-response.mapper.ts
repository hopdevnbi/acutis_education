import { CatechismLevelListResponseDto } from '../dto/catechism-level-list-response.dto';
import { CatechismLevelResponseDto } from '../dto/catechism-level-response.dto';
import type {
  CatechismLevelSnapshot,
  ListCatechismLevelsResult,
} from '../interfaces/catechism-level.interface';

export function toCatechismLevelResponseDto(
  snapshot: CatechismLevelSnapshot,
): CatechismLevelResponseDto {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    code: snapshot.code,
    name: snapshot.name,
    sortOrder: snapshot.sortOrder,
    status: snapshot.status,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

export function toCatechismLevelListResponseDto(
  result: ListCatechismLevelsResult,
): CatechismLevelListResponseDto {
  return {
    items: result.items.map(toCatechismLevelResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
