import { CommunicationTargetType, EventRegistrationStatus, EventScopeType, EventStatus } from '../enums/event.enums';
import {
  InvalidEventRegistrationError,
  InvalidEventScopeError,
} from '../errors/event.errors';
import {
  buildEventOperationKey,
  buildEventRegistrantKey,
  buildEventScopeKey,
  buildEventTargetKey,
  normalizeEventCode,
} from './event-key.util';

describe('EventKeyUtil', () => {
  describe('buildEventScopeKey', () => {
    it('returns GLOBAL for global scope', () => {
      expect(buildEventScopeKey({ scopeType: EventScopeType.Global })).toBe('GLOBAL');
    });

    it('throws if global scope has parishId or classId', () => {
      expect(() =>
        buildEventScopeKey({
          scopeType: EventScopeType.Global,
          parishId: '11111111-1111-4111-8111-111111111111',
        }),
      ).toThrow(InvalidEventScopeError);
    });

    it('returns PARISH:<parishId> for parish scope', () => {
      const parishId = '11111111-1111-4111-8111-111111111111';
      expect(
        buildEventScopeKey({
          scopeType: EventScopeType.Parish,
          parishId,
        }),
      ).toBe(`PARISH:${parishId.toLowerCase()}`);
    });

    it('returns CLASS:<classId> for class scope', () => {
      const classId = '22222222-2222-4222-8222-222222222222';
      expect(
        buildEventScopeKey({
          scopeType: EventScopeType.Class,
          classId,
        }),
      ).toBe(`CLASS:${classId.toLowerCase()}`);
    });
  });

  describe('buildEventRegistrantKey', () => {
    it('returns USER:<userId> for self registration', () => {
      const userId = '33333333-3333-4333-8333-333333333333';
      expect(buildEventRegistrantKey({ userId })).toBe(`USER:${userId.toLowerCase()}`);
    });

    it('returns STUDENT:<studentId> when registering a child', () => {
      const userId = '33333333-3333-4333-8333-333333333333';
      const studentId = '44444444-4444-4444-8444-444444444444';
      expect(buildEventRegistrantKey({ userId, studentId })).toBe(
        `STUDENT:${studentId.toLowerCase()}`,
      );
    });

    it('throws if userId is missing', () => {
      expect(() =>
        buildEventRegistrantKey({
          userId: '',
        }),
      ).toThrow(InvalidEventRegistrationError);
    });
  });

  describe('buildEventOperationKey', () => {
    const eventId = '11111111-1111-4111-8111-111111111111';

    it('formats EVENT_PUBLISHED key', () => {
      expect(
        buildEventOperationKey({
          eventType: 'EVENT_PUBLISHED',
          eventId,
        }),
      ).toBe(`EVENT_PUBLISHED:${eventId.toLowerCase()}`);
    });

    it('formats EVENT_UPDATED key with optimistic version', () => {
      expect(
        buildEventOperationKey({
          eventType: 'EVENT_UPDATED',
          eventId,
          version: 3,
        }),
      ).toBe(`EVENT_UPDATED:${eventId.toLowerCase()}:v3`);
    });

    it('formats EVENT_CANCELLED key', () => {
      expect(
        buildEventOperationKey({
          eventType: 'EVENT_CANCELLED',
          eventId,
        }),
      ).toBe(`EVENT_CANCELLED:${eventId.toLowerCase()}`);
    });
  });

  describe('normalizeEventCode', () => {
    it('normalizes code to uppercase and hyphenates spaces', () => {
      expect(normalizeEventCode('  easter camp 2026 ')).toBe('EASTER-CAMP-2026');
    });
  });

  describe('enums', () => {
    it('contains expected status and registration status values', () => {
      expect(Object.values(EventStatus)).toEqual(
        expect.arrayContaining(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'ARCHIVED']),
      );
      expect(Object.values(EventRegistrationStatus)).toEqual(
        expect.arrayContaining(['REGISTERED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']),
      );
    });
  });
});
