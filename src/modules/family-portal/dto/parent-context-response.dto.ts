import { ApiProperty } from '@nestjs/swagger';
import type { ParentPortalContextSnapshot } from '../interfaces/parent-portal.interface';

export class ParentContextResponseDto {
  @ApiProperty({ format: 'uuid' })
  actorUserId!: string;

  @ApiProperty()
  linkedChildCount!: number;

  @ApiProperty()
  activeEnrollmentCount!: number;
}

export function toParentContextResponseDto(
  snapshot: ParentPortalContextSnapshot,
): ParentContextResponseDto {
  return {
    actorUserId: snapshot.actorUserId,
    linkedChildCount: snapshot.linkedChildCount,
    activeEnrollmentCount: snapshot.activeEnrollmentCount,
  };
}
