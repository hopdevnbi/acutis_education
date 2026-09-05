import {
  CommunicationTargetType,
  EventRegistrationStatus,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';
import type {
  EventAttendeeSnapshot,
  EventRegistrationSnapshot,
  EventSnapshot,
  EventTargetSnapshot,
  EventWithTargetsSnapshot,
} from '../interfaces/event.interfaces';
import {
  toEventAdminResponseDto,
  toEventAttendeeListItemDto,
  toEventDetailDto,
  toEventListItemDto,
  toEventRegistrationDto,
  toMyEventRegistrationItemDto,
} from './event-http.mapper';

describe('EventHttpMapper', () => {
  const event: EventSnapshot = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'RETREAT-2026',
    title: 'Youth Retreat',
    description: 'Detailed itinerary and instructions for participants.',
    summary: 'A short summary',
    locale: 'vi-VN',
    scopeType: EventScopeType.Parish,
    scopeKey: 'PARISH:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    parishId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    classId: null,
    status: EventStatus.Published,
    timezone: 'Asia/Ho_Chi_Minh',
    startsAt: new Date('2026-10-01T08:00:00Z'),
    endsAt: new Date('2026-10-01T17:00:00Z'),
    venueName: 'Parish Hall',
    address: '123 Main St',
    coverMediaAssetId: null,
    capacity: 50,
    isRegistrationRequired: true,
    registrationDeadline: new Date('2026-09-25T23:59:59Z'),
    publishedAt: new Date('2026-09-01T00:00:00Z'),
    cancelledAt: null,
    cancellationReason: null,
    version: 1,
    createdByUserId: '22222222-2222-4222-8222-222222222222',
    updatedByUserId: '22222222-2222-4222-8222-222222222222',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  };

  const target: EventTargetSnapshot = {
    id: '33333333-3333-4333-8333-333333333333',
    eventId: event.id,
    targetType: CommunicationTargetType.Parish,
    parishId: event.parishId,
    classId: null,
    roleCode: null,
    targetKey: 'PARISH:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    createdAt: new Date('2026-09-01T00:00:00Z'),
  };

  const registration: EventRegistrationSnapshot = {
    id: '44444444-4444-4444-8444-444444444444',
    eventId: event.id,
    registrantKey: 'USER:55555555-5555-4555-8555-555555555555',
    userId: '55555555-5555-4555-8555-555555555555',
    studentId: null,
    enrollmentId: null,
    status: EventRegistrationStatus.Registered,
    registeredAt: new Date('2026-09-05T10:00:00Z'),
    cancelledAt: null,
    checkedInAt: null,
    createdAt: new Date('2026-09-05T10:00:00Z'),
    updatedAt: new Date('2026-09-05T10:00:00Z'),
  };

  describe('toEventListItemDto', () => {
    it('omits description and audit actor IDs for public privacy', () => {
      const dto = toEventListItemDto(event, true);
      expect((dto as any).description).toBeUndefined();
      expect((dto as any).createdByUserId).toBeUndefined();
      expect((dto as any).updatedByUserId).toBeUndefined();
      expect(dto.isRegistered).toBe(true);
      expect(dto.id).toBe(event.id);
      expect(dto.code).toBe(event.code);
    });
  });

  describe('toEventDetailDto', () => {
    it('includes full description and caller registration status', () => {
      const dto = toEventDetailDto(event, registration);
      expect(dto.description).toBe(event.description);
      expect(dto.currentUserRegistration).not.toBeNull();
      expect(dto.currentUserRegistration?.status).toBe(EventRegistrationStatus.Registered);
      expect(dto.isRegistered).toBe(true);
    });
  });

  describe('toEventAdminResponseDto', () => {
    it('serializes full admin model including version and targets', () => {
      const item: EventWithTargetsSnapshot = {
        event,
        targets: [target],
        activeRegistrationCount: 15,
      };
      const dto = toEventAdminResponseDto(item);
      expect(dto.version).toBe(1);
      expect(dto.activeRegistrationCount).toBe(15);
      expect(dto.targets).toHaveLength(1);
      expect((dto.targets[0] as any).targetKey).toBeUndefined();
    });
  });

  describe('toEventAttendeeListItemDto', () => {
    it('minimizes attendee PII and formats registrantType', () => {
      const attendee: EventAttendeeSnapshot = {
        registration,
        displayName: 'John Doe',
      };
      const dto = toEventAttendeeListItemDto(attendee);
      expect(dto.id).toBe(registration.id);
      expect(dto.registrantType).toBe('USER');
      expect(dto.displayName).toBe('John Doe');
      expect((dto as any).email).toBeUndefined();
      expect((dto as any).phone).toBeUndefined();
      expect((dto as any).guardianContact).toBeUndefined();
    });
  });
});
