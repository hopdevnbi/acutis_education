import type { ParishSortDirection, ParishSortField } from '../constants/parish-list.constants';
import type { ParishStatus } from '../enums/parish-status.enum';

export interface ListParishesInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: ParishSortField;
  readonly sort: ParishSortDirection;
  readonly status?: ParishStatus;
  readonly search?: string;
}
