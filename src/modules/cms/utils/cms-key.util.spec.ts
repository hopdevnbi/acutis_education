import { CmsScopeType, CmsEntryStatus, CmsEntryType } from '../enums/cms.enums';
import { InvalidCmsScopeError } from '../errors/cms.errors';
import { buildCmsScopeKey, normalizeCmsSlug } from './cms-key.util';

describe('CmsKeyUtil', () => {
  describe('buildCmsScopeKey', () => {
    it('returns GLOBAL for Global scope when parishId is not provided', () => {
      const result = buildCmsScopeKey({ scopeType: CmsScopeType.Global });
      expect(result).toBe('GLOBAL');
    });

    it('throws InvalidCmsScopeError when Global scope has parishId', () => {
      expect(() =>
        buildCmsScopeKey({
          scopeType: CmsScopeType.Global,
          parishId: '11111111-1111-4111-8111-111111111111',
        }),
      ).toThrow(InvalidCmsScopeError);
    });

    it('returns PARISH:<parishId> for Parish scope when parishId is provided', () => {
      const parishId = '11111111-1111-4111-8111-111111111111';
      const result = buildCmsScopeKey({
        scopeType: CmsScopeType.Parish,
        parishId,
      });
      expect(result).toBe(`PARISH:${parishId.toLowerCase()}`);
    });

    it('throws InvalidCmsScopeError when Parish scope lacks parishId', () => {
      expect(() =>
        buildCmsScopeKey({
          scopeType: CmsScopeType.Parish,
          parishId: null,
        }),
      ).toThrow(InvalidCmsScopeError);
    });
  });

  describe('normalizeCmsSlug', () => {
    it('converts uppercase to lowercase and replaces spaces with hyphens', () => {
      expect(normalizeCmsSlug('  About Us Page  ')).toBe('about-us-page');
    });

    it('strips special characters that are not allowed in slugs', () => {
      expect(normalizeCmsSlug('news-item-@2026!#')).toBe('news-item-2026');
    });
  });

  describe('enums', () => {
    it('contains expected status and type values', () => {
      expect(Object.values(CmsEntryStatus)).toEqual(
        expect.arrayContaining(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']),
      );
      expect(Object.values(CmsEntryType)).toEqual(
        expect.arrayContaining(['PAGE', 'ARTICLE', 'NEWS']),
      );
    });
  });
});
