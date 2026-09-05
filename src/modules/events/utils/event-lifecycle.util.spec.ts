import { EventStatus } from '../enums/event.enums';
import {
  EventAlreadyArchivedError,
  EventAlreadyCancelledError,
  EventAlreadyCompletedError,
  EventAlreadyPublishedError,
  EventNotEditableError,
  InvalidEventScopeError,
  InvalidEventTransitionError,
} from '../errors/event.errors';
import {
  assertEventFieldsEditable,
  assertValidEventTransition,
  detectEventSignificantChanges,
  isValidEventTransition,
  validateEventTimeWindow,
} from './event-lifecycle.util';

describe('EventLifecycleUtil', () => {
  describe('isValidEventTransition', () => {
    it('allows DRAFT forward transitions to PUBLISHED and ARCHIVED', () => {
      expect(isValidEventTransition(EventStatus.Draft, EventStatus.Published)).toBe(true);
      expect(isValidEventTransition(EventStatus.Draft, EventStatus.Archived)).toBe(true);
    });

    it('allows PUBLISHED to transition to CANCELLED and COMPLETED', () => {
      expect(isValidEventTransition(EventStatus.Published, EventStatus.Cancelled)).toBe(true);
      expect(isValidEventTransition(EventStatus.Published, EventStatus.Completed)).toBe(true);
      expect(isValidEventTransition(EventStatus.Published, EventStatus.Draft)).toBe(false);
      expect(isValidEventTransition(EventStatus.Published, EventStatus.Archived)).toBe(false);
    });

    it('allows CANCELLED to transition to ARCHIVED', () => {
      expect(isValidEventTransition(EventStatus.Cancelled, EventStatus.Archived)).toBe(true);
      expect(isValidEventTransition(EventStatus.Cancelled, EventStatus.Published)).toBe(false);
    });

    it('allows COMPLETED to transition to ARCHIVED', () => {
      expect(isValidEventTransition(EventStatus.Completed, EventStatus.Archived)).toBe(true);
      expect(isValidEventTransition(EventStatus.Completed, EventStatus.Published)).toBe(false);
    });

    it('treats ARCHIVED as terminal', () => {
      expect(isValidEventTransition(EventStatus.Archived, EventStatus.Draft)).toBe(false);
      expect(isValidEventTransition(EventStatus.Archived, EventStatus.Published)).toBe(false);
      expect(isValidEventTransition(EventStatus.Archived, EventStatus.Cancelled)).toBe(false);
    });
  });

  describe('assertValidEventTransition', () => {
    it('throws EventAlreadyPublishedError when republishing', () => {
      expect(() =>
        assertValidEventTransition(EventStatus.Published, EventStatus.Published),
      ).toThrow(EventAlreadyPublishedError);
    });

    it('throws EventAlreadyCancelledError when cancelling cancelled event', () => {
      expect(() =>
        assertValidEventTransition(EventStatus.Cancelled, EventStatus.Cancelled),
      ).toThrow(EventAlreadyCancelledError);
    });

    it('throws EventAlreadyCompletedError when completing completed event', () => {
      expect(() =>
        assertValidEventTransition(EventStatus.Completed, EventStatus.Completed),
      ).toThrow(EventAlreadyCompletedError);
    });

    it('throws EventAlreadyArchivedError when re-archiving', () => {
      expect(() =>
        assertValidEventTransition(EventStatus.Archived, EventStatus.Archived),
      ).toThrow(EventAlreadyArchivedError);
    });

    it('throws InvalidEventTransitionError on forbidden transition', () => {
      expect(() =>
        assertValidEventTransition(EventStatus.Published, EventStatus.Draft),
      ).toThrow(InvalidEventTransitionError);
    });
  });

  describe('validateEventTimeWindow', () => {
    const start = new Date('2026-09-10T10:00:00Z');
    const end = new Date('2026-09-10T12:00:00Z');

    it('passes when endsAt > startsAt and registrationDeadline < startsAt', () => {
      const deadline = new Date('2026-09-09T23:59:59Z');
      expect(() => validateEventTimeWindow(start, end, deadline)).not.toThrow();
    });

    it('throws if endsAt <= startsAt', () => {
      expect(() => validateEventTimeWindow(start, start)).toThrow(InvalidEventScopeError);
      expect(() => validateEventTimeWindow(end, start)).toThrow(InvalidEventScopeError);
    });

    it('throws if registrationDeadline >= startsAt', () => {
      expect(() => validateEventTimeWindow(start, end, start)).toThrow(InvalidEventScopeError);
      expect(() =>
        validateEventTimeWindow(start, end, new Date('2026-09-11T00:00:00Z')),
      ).toThrow(InvalidEventScopeError);
    });
  });

  describe('assertEventFieldsEditable', () => {
    it('allows editing draft fields', () => {
      expect(() =>
        assertEventFieldsEditable(EventStatus.Draft, ['title', 'scopeType', 'targets']),
      ).not.toThrow();
    });

    it('throws EventNotEditableError when modifying immutable fields on PUBLISHED', () => {
      expect(() =>
        assertEventFieldsEditable(EventStatus.Published, ['scopeType']),
      ).toThrow(EventNotEditableError);
      expect(() =>
        assertEventFieldsEditable(EventStatus.Published, ['parishId']),
      ).toThrow(EventNotEditableError);
      expect(() =>
        assertEventFieldsEditable(EventStatus.Published, ['targets']),
      ).toThrow(EventNotEditableError);
    });

    it('allows editing safe fields on PUBLISHED', () => {
      expect(() =>
        assertEventFieldsEditable(EventStatus.Published, ['title', 'description', 'venueName']),
      ).not.toThrow();
    });

    it('throws EventNotEditableError on ARCHIVED, CANCELLED, or COMPLETED', () => {
      expect(() =>
        assertEventFieldsEditable(EventStatus.Archived, ['title']),
      ).toThrow(EventNotEditableError);
      expect(() =>
        assertEventFieldsEditable(EventStatus.Cancelled, ['title']),
      ).toThrow(EventNotEditableError);
      expect(() =>
        assertEventFieldsEditable(EventStatus.Completed, ['title']),
      ).toThrow(EventNotEditableError);
    });
  });

  describe('detectEventSignificantChanges', () => {
    const base = {
      startsAt: new Date('2026-09-10T10:00:00Z'),
      endsAt: new Date('2026-09-10T12:00:00Z'),
      timezone: 'Asia/Ho_Chi_Minh',
      venueName: 'Parish Hall',
      address: '123 Main St',
      capacity: 100,
    };

    it('detects DATE_TIME change', () => {
      const changes = detectEventSignificantChanges({
        current: base,
        updated: { startsAt: new Date('2026-09-10T11:00:00Z') },
      });
      expect(changes).toContain('DATE_TIME');
      expect(changes).toHaveLength(1);
    });

    it('detects VENUE change', () => {
      const changes = detectEventSignificantChanges({
        current: base,
        updated: { venueName: 'Outdoor Grounds' },
      });
      expect(changes).toContain('VENUE');
      expect(changes).toHaveLength(1);
    });

    it('detects CAPACITY change', () => {
      const changes = detectEventSignificantChanges({
        current: base,
        updated: { capacity: 150 },
      });
      expect(changes).toContain('CAPACITY');
      expect(changes).toHaveLength(1);
    });

    it('returns empty array when only minor fields change', () => {
      const changes = detectEventSignificantChanges({
        current: base,
        updated: { venueName: 'Parish Hall' },
      });
      expect(changes).toHaveLength(0);
    });
  });
});
