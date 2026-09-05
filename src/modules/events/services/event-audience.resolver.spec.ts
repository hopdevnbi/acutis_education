import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { StudentService } from '../../student/services/student.service';
import { CommunicationTargetType, EventScopeType, EventStatus } from '../enums/event.enums';
import type { EventSnapshot, EventTargetSnapshot } from '../interfaces/event.interfaces';
import { EventAudienceResolver } from './event-audience.resolver';

describe('EventAudienceResolver', () => {
  let resolver: EventAudienceResolver;
  let parishScopeService: jest.Mocked<Partial<ParishScopeService>>;
  let accessControlService: jest.Mocked<Partial<AccessControlService>>;
  let classCatechistAssignmentService: jest.Mocked<Partial<ClassCatechistAssignmentService>>;
  let studentService: jest.Mocked<Partial<StudentService>>;
  let enrollmentQueryService: jest.Mocked<Partial<EnrollmentQueryService>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const parishId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const classId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const studentId = 'ssssssss-ssss-4sss-8sss-ssssssssssss';

  beforeEach(async () => {
    parishScopeService = {
      listActiveParishIdsForMember: jest.fn().mockResolvedValue([parishId]),
    };

    accessControlService = {
      getRolesForUser: jest.fn().mockResolvedValue([{ code: 'PARENT' }]),
    };

    classCatechistAssignmentService = {
      listAssignedClassIds: jest.fn().mockResolvedValue([]),
    };

    studentService = {
      listStudentIdsByLinkedUserId: jest.fn().mockResolvedValue([]),
    };

    enrollmentQueryService = {
      listStudentIdsForGuardian: jest.fn().mockResolvedValue([studentId]),
      listActiveEnrollmentsByStudentIds: jest.fn().mockResolvedValue([
        {
          id: 'enr-1',
          classId,
          parishId,
        } as any,
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAudienceResolver,
        { provide: ParishScopeService, useValue: parishScopeService },
        { provide: AccessControlService, useValue: accessControlService },
        {
          provide: ClassCatechistAssignmentService,
          useValue: classCatechistAssignmentService,
        },
        { provide: StudentService, useValue: studentService },
        { provide: EnrollmentQueryService, useValue: enrollmentQueryService },
      ],
    }).compile();

    resolver = module.get<EventAudienceResolver>(EventAudienceResolver);
  });

  describe('resolveAudienceKeys', () => {
    it('aggregates GLOBAL, PARISH, ROLE, and CLASS keys for parent with enrolled child', async () => {
      const keys = await resolver.resolveAudienceKeys(userId);

      expect(keys).toContain('GLOBAL');
      expect(keys).toContain(`PARISH:${parishId.toLowerCase()}`);
      expect(keys).toContain(`ROLE:${parishId.toLowerCase()}:PARENT`);
      expect(keys).toContain(`CLASS:${classId.toLowerCase()}`);
    });
  });

  describe('isChildEligibleForEvent', () => {
    const mockEvent: EventSnapshot = {
      id: 'e1',
      code: 'PARISH-EVENT',
      title: 'Parish Event',
      description: 'Desc',
      summary: null,
      locale: 'vi-VN',
      scopeType: EventScopeType.Parish,
      scopeKey: `PARISH:${parishId}`,
      parishId,
      classId: null,
      status: EventStatus.Published,
      timezone: 'Asia/Ho_Chi_Minh',
      startsAt: new Date(),
      endsAt: new Date(),
      venueName: null,
      address: null,
      coverMediaAssetId: null,
      capacity: null,
      isRegistrationRequired: true,
      registrationDeadline: null,
      publishedAt: new Date(),
      cancelledAt: null,
      cancellationReason: null,
      version: 1,
      createdByUserId: userId,
      updatedByUserId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('matches when explicit target matches child class', async () => {
      const targets: EventTargetSnapshot[] = [
        {
          id: 't1',
          eventId: 'e1',
          targetType: CommunicationTargetType.Class,
          parishId: null,
          classId,
          roleCode: null,
          targetKey: `CLASS:${classId}`,
          createdAt: new Date(),
        },
      ];

      const eligible = await resolver.isChildEligibleForEvent(studentId, mockEvent, targets);
      expect(eligible).toBe(true);
    });

    it('falls back to event ownership scope when targets are empty', async () => {
      const eligible = await resolver.isChildEligibleForEvent(studentId, mockEvent, []);
      expect(eligible).toBe(true);
    });

    it('returns false when child does not belong to target parish or class', async () => {
      const foreignEvent: EventSnapshot = {
        ...mockEvent,
        parishId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        scopeKey: 'PARISH:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      };

      const eligible = await resolver.isChildEligibleForEvent(studentId, foreignEvent, []);
      expect(eligible).toBe(false);
    });
  });
});
