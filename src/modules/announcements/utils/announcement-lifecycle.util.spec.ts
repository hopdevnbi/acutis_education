import { AnnouncementStatus } from '../enums/announcement.enums';
import {
  AnnouncementAlreadyArchivedError,
  AnnouncementAlreadyPublishedError,
  AnnouncementNotEditableError,
  InvalidAnnouncementScheduleError,
  InvalidAnnouncementTransitionError,
} from '../errors/announcement.errors';
import {
  assertAnnouncementFieldsEditable,
  assertValidAnnouncementTransition,
  isValidAnnouncementTransition,
  validateAnnouncementTimeWindow,
} from './announcement-lifecycle.util';

describe('AnnouncementLifecycleUtil', () => {
  describe('isValidAnnouncementTransition', () => {
    it('allows DRAFT forward transitions to PUBLISHED and ARCHIVED', () => {
      expect(isValidAnnouncementTransition(AnnouncementStatus.Draft, AnnouncementStatus.Published)).toBe(true);
      expect(isValidAnnouncementTransition(AnnouncementStatus.Draft, AnnouncementStatus.Archived)).toBe(true);
    });

    it('allows PUBLISHED to transition to ARCHIVED', () => {
      expect(isValidAnnouncementTransition(AnnouncementStatus.Published, AnnouncementStatus.Archived)).toBe(true);
      expect(isValidAnnouncementTransition(AnnouncementStatus.Published, AnnouncementStatus.Draft)).toBe(false);
    });

    it('treats ARCHIVED as terminal', () => {
      expect(isValidAnnouncementTransition(AnnouncementStatus.Archived, AnnouncementStatus.Draft)).toBe(false);
      expect(isValidAnnouncementTransition(AnnouncementStatus.Archived, AnnouncementStatus.Published)).toBe(false);
    });
  });

  describe('assertValidAnnouncementTransition', () => {
    it('throws AnnouncementAlreadyPublishedError when republishing', () => {
      expect(() =>
        assertValidAnnouncementTransition(AnnouncementStatus.Published, AnnouncementStatus.Published),
      ).toThrow(AnnouncementAlreadyPublishedError);
    });

    it('throws AnnouncementAlreadyArchivedError when re-archiving', () => {
      expect(() =>
        assertValidAnnouncementTransition(AnnouncementStatus.Archived, AnnouncementStatus.Archived),
      ).toThrow(AnnouncementAlreadyArchivedError);
    });

    it('throws InvalidAnnouncementTransitionError on forbidden transition', () => {
      expect(() =>
        assertValidAnnouncementTransition(AnnouncementStatus.Published, AnnouncementStatus.Draft),
      ).toThrow(InvalidAnnouncementTransitionError);
    });
  });

  describe('validateAnnouncementTimeWindow', () => {
    const start = new Date('2026-09-01T08:00:00Z');

    it('passes when endsAt is after startsAt', () => {
      const end = new Date('2026-09-05T08:00:00Z');
      expect(() => validateAnnouncementTimeWindow(start, end)).not.toThrow();
    });

    it('throws InvalidAnnouncementScheduleError when endsAt is before startsAt', () => {
      const end = new Date('2026-08-31T08:00:00Z');
      expect(() => validateAnnouncementTimeWindow(start, end)).toThrow(InvalidAnnouncementScheduleError);
    });
  });

  describe('assertAnnouncementFieldsEditable', () => {
    it('allows editing any field on DRAFT', () => {
      expect(() =>
        assertAnnouncementFieldsEditable(AnnouncementStatus.Draft, ['title', 'scopeType', 'targets']),
      ).not.toThrow();
    });

    it('throws AnnouncementNotEditableError when modifying immutable fields on PUBLISHED', () => {
      expect(() =>
        assertAnnouncementFieldsEditable(AnnouncementStatus.Published, ['scopeType']),
      ).toThrow(AnnouncementNotEditableError);

      expect(() =>
        assertAnnouncementFieldsEditable(AnnouncementStatus.Published, ['targets']),
      ).toThrow(AnnouncementNotEditableError);

      expect(() =>
        assertAnnouncementFieldsEditable(AnnouncementStatus.Published, ['parishId']),
      ).toThrow(AnnouncementNotEditableError);
    });

    it('allows editing title, body, and summary on PUBLISHED', () => {
      expect(() =>
        assertAnnouncementFieldsEditable(AnnouncementStatus.Published, ['title', 'body', 'summary']),
      ).not.toThrow();
    });

    it('throws AnnouncementNotEditableError for any edit on ARCHIVED', () => {
      expect(() =>
        assertAnnouncementFieldsEditable(AnnouncementStatus.Archived, ['title']),
      ).toThrow(AnnouncementNotEditableError);
    });
  });
});
