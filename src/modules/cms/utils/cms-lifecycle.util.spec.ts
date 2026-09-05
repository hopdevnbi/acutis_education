import { CmsEntryStatus } from '../enums/cms.enums';
import {
  CmsEntryNotEditableError,
  InvalidCmsLifecycleTransitionError,
  InvalidCmsScheduleError,
} from '../errors/cms.errors';
import {
  assertFieldsEditable,
  assertValidCmsTransition,
  isValidCmsTransition,
  validateCmsScheduleDates,
} from './cms-lifecycle.util';

describe('CmsLifecycleUtil', () => {
  describe('isValidCmsTransition', () => {
    it('allows valid forward transitions from DRAFT', () => {
      expect(isValidCmsTransition(CmsEntryStatus.Draft, CmsEntryStatus.Scheduled)).toBe(true);
      expect(isValidCmsTransition(CmsEntryStatus.Draft, CmsEntryStatus.Published)).toBe(true);
      expect(isValidCmsTransition(CmsEntryStatus.Draft, CmsEntryStatus.Archived)).toBe(true);
    });

    it('allows transitions from SCHEDULED', () => {
      expect(isValidCmsTransition(CmsEntryStatus.Scheduled, CmsEntryStatus.Published)).toBe(true);
      expect(isValidCmsTransition(CmsEntryStatus.Scheduled, CmsEntryStatus.Draft)).toBe(true);
      expect(isValidCmsTransition(CmsEntryStatus.Scheduled, CmsEntryStatus.Archived)).toBe(true);
    });

    it('allows transitions from PUBLISHED', () => {
      expect(isValidCmsTransition(CmsEntryStatus.Published, CmsEntryStatus.Archived)).toBe(true);
      expect(isValidCmsTransition(CmsEntryStatus.Published, CmsEntryStatus.Draft)).toBe(false);
      expect(isValidCmsTransition(CmsEntryStatus.Published, CmsEntryStatus.Scheduled)).toBe(false);
    });

    it('treats ARCHIVED as terminal', () => {
      expect(isValidCmsTransition(CmsEntryStatus.Archived, CmsEntryStatus.Draft)).toBe(false);
      expect(isValidCmsTransition(CmsEntryStatus.Archived, CmsEntryStatus.Scheduled)).toBe(false);
      expect(isValidCmsTransition(CmsEntryStatus.Archived, CmsEntryStatus.Published)).toBe(false);
    });
  });

  describe('assertValidCmsTransition', () => {
    it('throws InvalidCmsLifecycleTransitionError on forbidden transition', () => {
      expect(() =>
        assertValidCmsTransition(CmsEntryStatus.Published, CmsEntryStatus.Draft),
      ).toThrow(InvalidCmsLifecycleTransitionError);
    });
  });

  describe('validateCmsScheduleDates', () => {
    const baseNow = new Date('2026-09-01T12:00:00Z');

    it('passes for valid future scheduledFor and subsequent expiresAt', () => {
      expect(() =>
        validateCmsScheduleDates({
          scheduledFor: new Date('2026-09-02T12:00:00Z'),
          expiresAt: new Date('2026-09-05T12:00:00Z'),
          now: baseNow,
        }),
      ).not.toThrow();
    });

    it('throws when scheduledFor is in the past', () => {
      expect(() =>
        validateCmsScheduleDates({
          scheduledFor: new Date('2026-08-30T12:00:00Z'),
          now: baseNow,
        }),
      ).toThrow(InvalidCmsScheduleError);
    });

    it('throws when expiresAt is before scheduledFor', () => {
      expect(() =>
        validateCmsScheduleDates({
          scheduledFor: new Date('2026-09-03T12:00:00Z'),
          expiresAt: new Date('2026-09-02T12:00:00Z'),
          now: baseNow,
        }),
      ).toThrow(InvalidCmsScheduleError);
    });
  });

  describe('assertFieldsEditable', () => {
    it('allows any field modification on DRAFT', () => {
      expect(() =>
        assertFieldsEditable(CmsEntryStatus.Draft, ['slug', 'title', 'body', 'scopeType']),
      ).not.toThrow();
    });

    it('throws when modifying immutable fields on PUBLISHED', () => {
      expect(() =>
        assertFieldsEditable(CmsEntryStatus.Published, ['slug']),
      ).toThrow(CmsEntryNotEditableError);

      expect(() =>
        assertFieldsEditable(CmsEntryStatus.Published, ['scopeType']),
      ).toThrow(CmsEntryNotEditableError);

      expect(() =>
        assertFieldsEditable(CmsEntryStatus.Published, ['parishId']),
      ).toThrow(CmsEntryNotEditableError);
    });

    it('allows modifying title, body, and summary on PUBLISHED', () => {
      expect(() =>
        assertFieldsEditable(CmsEntryStatus.Published, ['title', 'summary', 'body']),
      ).not.toThrow();
    });

    it('throws on any edit on ARCHIVED', () => {
      expect(() =>
        assertFieldsEditable(CmsEntryStatus.Archived, ['title']),
      ).toThrow(CmsEntryNotEditableError);
    });
  });
});
