import { Test, TestingModule } from '@nestjs/testing';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { CommunicationTargetType, EventScopeType, EventStatus } from '../enums/event.enums';
import {
  EventAccessDeniedError,
  EventTargetNotAllowedError,
  InvalidEventScopeError,
} from '../errors/event.errors';
import type { EventSnapshot } from '../interfaces/event.interfaces';
import { EventAccessService } from './event-access.service';

describe('EventAccessService', () => {
  let service: EventAccessService;
  let accessControlService: jest.Mocked<Partial<AccessControlService>>;
  let parishScopeService: jest.Mocked<Partial<ParishScopeService>>;
  let classCatechistAssignmentService: jest.Mocked<Partial<ClassCatechistAssignmentService>>;
  let classService: jest.Mocked<Partial<ClassService>>;

  const superAdminUserId = '11111111-1111-4111-8111-111111111111';
  const parishAdminUserId = '22222222-2222-4222-8222-222222222222';
  const catechistUserId = '33333333-3333-4333-8333-333333333333';
  const regularUserId = '44444444-4444-4444-8444-444444444444';
  const parishId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const foreignParishId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const classId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  beforeEach(async () => {
    accessControlService = {
      getRolesForUser: jest.fn().mockImplementation(async (userId: string) => {
        if (userId === superAdminUserId) return [{ code: SUPER_ADMIN_ROLE_CODE }];
        if (userId === parishAdminUserId) return [{ code: 'PARISH_ADMIN' }];
        if (userId === catechistUserId) return [{ code: 'CATECHIST' }];
        return [{ code: 'STUDENT' }];
      }),
    };

    parishScopeService = {
      hasActiveParishMembership: jest
        .fn()
        .mockImplementation(async (userId: string, pid: string) => {
          return userId === parishAdminUserId && pid === parishId;
        }),
      listActiveParishIdsForMember: jest.fn().mockImplementation(async (userId: string) => {
        if (userId === parishAdminUserId) return [parishId];
        return [];
      }),
    };

    classCatechistAssignmentService = {
      listAssignedClassIds: jest.fn().mockImplementation(async (userId: string) => {
        if (userId === catechistUserId) return [classId];
        return [];
      }),
    };

    classService = {
      getClassById: jest.fn().mockImplementation(async (cid: string) => {
        if (cid === classId) {
          return { id: classId, parishId } as any;
        }
        return { id: cid, parishId: foreignParishId } as any;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAccessService,
        { provide: AccessControlService, useValue: accessControlService },
        { provide: ParishScopeService, useValue: parishScopeService },
        {
          provide: ClassCatechistAssignmentService,
          useValue: classCatechistAssignmentService,
        },
        { provide: ClassService, useValue: classService },
      ],
    }).compile();

    service = module.get<EventAccessService>(EventAccessService);
  });

  describe('assertCanCreateEvent', () => {
    it('allows SuperAdmin to create GLOBAL events', async () => {
      await expect(
        service.assertCanCreateEvent(superAdminUserId, {
          scopeType: EventScopeType.Global,
        }),
      ).resolves.not.toThrow();
    });

    it('denies ParishAdmin creating GLOBAL events', async () => {
      await expect(
        service.assertCanCreateEvent(parishAdminUserId, {
          scopeType: EventScopeType.Global,
        }),
      ).rejects.toThrow(EventAccessDeniedError);
    });

    it('allows ParishAdmin creating PARISH event in own parish', async () => {
      await expect(
        service.assertCanCreateEvent(parishAdminUserId, {
          scopeType: EventScopeType.Parish,
          parishId,
        }),
      ).resolves.not.toThrow();
    });

    it('denies ParishAdmin creating PARISH event in foreign parish', async () => {
      await expect(
        service.assertCanCreateEvent(parishAdminUserId, {
          scopeType: EventScopeType.Parish,
          parishId: foreignParishId,
        }),
      ).rejects.toThrow(EventAccessDeniedError);
    });

    it('denies ParishAdmin creating GLOBAL targets', async () => {
      await expect(
        service.assertCanCreateEvent(parishAdminUserId, {
          scopeType: EventScopeType.Parish,
          parishId,
          targets: [{ targetType: CommunicationTargetType.Global }],
        }),
      ).rejects.toThrow(EventTargetNotAllowedError);
    });

    it('denies Catechist creating PARISH event', async () => {
      await expect(
        service.assertCanCreateEvent(catechistUserId, {
          scopeType: EventScopeType.Parish,
          parishId,
        }),
      ).rejects.toThrow(EventAccessDeniedError);
    });

    it('allows Catechist creating CLASS event for assigned class', async () => {
      await expect(
        service.assertCanCreateEvent(catechistUserId, {
          scopeType: EventScopeType.Class,
          classId,
          parishId,
        }),
      ).resolves.not.toThrow();
    });

    it('denies Catechist creating CLASS event for unassigned class', async () => {
      await expect(
        service.assertCanCreateEvent(catechistUserId, {
          scopeType: EventScopeType.Class,
          classId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          parishId,
        }),
      ).rejects.toThrow(EventAccessDeniedError);
    });

    it('denies regular users from creating any event', async () => {
      await expect(
        service.assertCanCreateEvent(regularUserId, {
          scopeType: EventScopeType.Parish,
          parishId,
        }),
      ).rejects.toThrow(EventAccessDeniedError);
    });
  });

  describe('getAdminActorScope', () => {
    it('returns isSuperAdmin=true for SuperAdmin', async () => {
      const scope = await service.getAdminActorScope(superAdminUserId);
      expect(scope.isSuperAdmin).toBe(true);
      expect(scope.isCatechistOnly).toBe(false);
    });

    it('returns adminParishIds for ParishAdmin', async () => {
      const scope = await service.getAdminActorScope(parishAdminUserId);
      expect(scope.isSuperAdmin).toBe(false);
      expect(scope.adminParishIds).toEqual([parishId]);
      expect(scope.isCatechistOnly).toBe(false);
    });

    it('returns assignedClassIds for Catechist', async () => {
      const scope = await service.getAdminActorScope(catechistUserId);
      expect(scope.isSuperAdmin).toBe(false);
      expect(scope.assignedClassIds).toEqual([classId]);
      expect(scope.isCatechistOnly).toBe(true);
    });

    it('throws EventAccessDeniedError for non-administrative users', async () => {
      await expect(service.getAdminActorScope(regularUserId)).rejects.toThrow(
        EventAccessDeniedError,
      );
    });
  });
});
