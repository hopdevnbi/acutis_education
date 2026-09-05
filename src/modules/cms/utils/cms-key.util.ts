import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CmsScopeType } from '../enums/cms.enums';
import { InvalidCmsScopeError, InvalidCmsSlugError } from '../errors/cms.errors';

export const CMS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CMS_SLUG_MAX_LENGTH = 160;

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

export function validateCmsSlug(slug: string): boolean {
  if (!slug || slug.length > CMS_SLUG_MAX_LENGTH) {
    return false;
  }
  return CMS_SLUG_PATTERN.test(slug);
}

export function assertValidCmsSlug(slug: string): void {
  if (!validateCmsSlug(slug)) {
    throw new InvalidCmsSlugError(
      `Slug must match lowercase alphanumeric kebab pattern '^[a-z0-9]+(?:-[a-z0-9]+)*$' and be <= ${CMS_SLUG_MAX_LENGTH} characters.`,
    );
  }
}

export function normalizeCmsSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}
