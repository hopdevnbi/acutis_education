import { ParishResponseDto } from '../dto/parish-response.dto';
import { ParishListResponseDto } from '../dto/parish-list-response.dto';
import type { ListParishesResult } from '../interfaces/list-parishes-result.interface';
import type { ParishSnapshot } from '../interfaces/parish-snapshot.interface';

export function toParishResponseDto(snapshot: ParishSnapshot): ParishResponseDto {
  return {
    id: snapshot.id,
    code: snapshot.code,
    name: snapshot.name,
    status: snapshot.status,
    defaultLocale: snapshot.defaultLocale,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

export function toParishListResponseDto(result: ListParishesResult): ParishListResponseDto {
  return {
    items: result.items.map(toParishResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
