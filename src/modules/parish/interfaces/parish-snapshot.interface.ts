import type { ParishStatus } from '../enums/parish-status.enum';

export interface ParishSnapshot {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: ParishStatus;
  readonly defaultLocale: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
