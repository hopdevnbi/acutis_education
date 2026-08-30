import { InvalidCatechismLevelSortOrderError } from '../errors/catechism-level.errors';

export function parseCatechismLevelSortOrder(rawSortOrder: number): number {
  if (!Number.isInteger(rawSortOrder) || rawSortOrder < 0) {
    throw new InvalidCatechismLevelSortOrderError();
  }

  return rawSortOrder;
}
