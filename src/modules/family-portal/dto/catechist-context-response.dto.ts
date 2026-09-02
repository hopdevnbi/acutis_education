import { ApiProperty } from '@nestjs/swagger';
import type { CatechistPortalContextSnapshot } from '../interfaces/catechist-portal.interface';

export class CatechistContextResponseDto {
  @ApiProperty({ format: 'uuid' })
  actorUserId!: string;

  @ApiProperty()
  assignedClassCount!: number;

  @ApiProperty({ type: [String], format: 'uuid' })
  parishIds!: string[];
}

export function toCatechistContextResponseDto(
  snapshot: CatechistPortalContextSnapshot,
): CatechistContextResponseDto {
  return {
    actorUserId: snapshot.actorUserId,
    assignedClassCount: snapshot.assignedClassCount,
    parishIds: [...snapshot.parishIds],
  };
}
