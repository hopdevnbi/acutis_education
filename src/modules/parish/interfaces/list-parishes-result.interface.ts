import type { ParishSnapshot } from './parish-snapshot.interface';

export interface ListParishesResult {
  readonly items: readonly ParishSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}
