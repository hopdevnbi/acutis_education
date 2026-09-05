import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CmsScopeType } from '../enums/cms.enums';
import { InvalidCmsScopeError } from '../errors/cms.errors';

export function buildCmsScopeKey(input: {
  readonly scopeType: CmsScopeType;
  readonly parishId?: string | null;
}): string {
  switch (input.scopeType) {
    case CmsScopeType.Global:
      if (input.parishId) {
        throw new InvalidCmsScopeError('Global CMS entries must not have parishId.');
      }
      return 'GLOBAL';
    case CmsScopeType.Parish:
      if (!input.parishId) {
        throw new InvalidCmsScopeError('Parish CMS entries must specify parishId.');
      }
      return `PARISH:${normalizeUuid(input.parishId)}`;
    default:
      throw new InvalidCmsScopeError('Unknown CMS scope type.');
  }
}

export function normalizeCmsSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}
