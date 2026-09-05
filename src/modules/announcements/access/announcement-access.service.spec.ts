import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { ClassService } from '../../class/services/class.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../enums/announcement.enums';
import {
  AnnouncementAccessDeniedError,
  AnnouncementTargetNotAllowedError,
} from '../errors/announcement.errors';
import type { AnnouncementSnapshot } from '../interfaces/announcement.interfaces';
import { AnnouncementAccessService } from './announcement-access.service';

describe('AnnouncementAccessService', () => {
  let service: AnnouncementAccessService;
  let accessControlService: jest.Mocked<Partial<AccessControlService>>;
  let parishScopeService: jest.Mocked<Partial<ParishScopeService>>;
  let classCatechistAssignmentService: jest.Mocked<Partial<ClassCatechistAssignmentService>>;
  let classService: jest.Mocked<Partial<ClassService>>;

  const parishId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const foreignParishId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  const classId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  const superAdminId = '11111111-1111-4111-8111-111111111111';
  const parishAdminId = '22222222-2222-4222-8222-222222222222';
  const catechistId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    accessControlService = {
      getRolesForUser: jest.fn(),
    };
    parishScopeService = {
      hasActiveParishMembership: jest.fn(),
      listActiveParishIdsForMember: jest.fn(),
    };
    classCatechistAssignmentService = {
      listAssignedClassIds: jest.fn(),
    };
    classService = {
      getClassById: jest.fn(),
    };

    service = new AnnouncementAccessService(
      accessControlService as AccessControlService,
      parishScopeService as ParishScopeService,
      classCatechistAssignmentService as ClassCatechistAssignmentService,
      classService as ClassService,
    );
  });

  describe('SuperAdmin authority', () => {
    it('allows SuperAdmin to create GLOBAL announcements', async () => {
      (accessControlService.getRolesForUser as jest.Mock).mockResolvedValue([
        { code: 'SUPER_ADMIN' },
      ]);

      await expect(
        service.assertCanCreateAnnouncement(superAdminId, {
          scopeType: AnnouncementScopeType.Global,
          parishId: null,
          targets: [{ targetType: CommunicationTargetType.Global }],
        }),
      ).resolves.not.toThrow();
    });

    it('allows SuperAdmin to create PARISH announcements for any parish', async () => {
      (accessControlService.getRolesForUser as jest.Mock).mockResolvedValue([
        { code: 'SUPER_ADMIN' },
      ]);

      await expect(
        service.assertCanCreateAnnouncement(superAdminId, {
          scopeType: AnnouncementScopeType.Parish,
          parishId,
          targets: [{ targetType: CommunicationTargetType.Parish, parishId }],
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('ParishAdmin authority', () => {
    beforeEach(() => {
      (accessControlService.getRolesForUser as jest.Mock).mockResolvedValue([
        { code: 'PARISH_ADMIN' },
      ]);
      (parishScopeService.hasActiveParishMembership as jest.Mock).mockImplementation(
        async (_uid, pid) => pid === parishId,
      );
      (classService.getClassById as jest.Mock).mockResolvedValue({
        id: classId,
        parishId,
      } as any);
    });

    it('denies ParishAdmin from creating GLOBAL announcements', async () => {
      await expect(
        service.assertCanCreateAnnouncement(parishAdminId, {
          scopeType: AnnouncementScopeType.Global,
          parishId: null,
          targets: [{ targetType: CommunicationTargetType.Global }],
        }),
      ).rejects.toThrow(AnnouncementAccessDeniedError);
    });

    it('denies ParishAdmin from creating announcements for foreign parish', async () => {
      await expect(
        service.assertCanCreateAnnouncement(parishAdminId, {
          scopeType: AnnouncementScopeType.Parish,
          parishId: foreignParishId,
          targets: [{ targetType: CommunicationTargetType.Parish, parishId: foreignParishId }],
        }),
      ).rejects.toThrow(AnnouncementAccessDeniedError);
    });

    it('denies ParishAdmin from adding GLOBAL targets', async () => {
      await expect(
        service.assertCanCreateAnnouncement(parishAdminId, {
          scopeType: AnnouncementScopeType.Parish,
          parishId,
          targets: [{ targetType: CommunicationTargetType.Global }],
        }),
      ).rejects.toThrow(AnnouncementTargetNotAllowedError);
    });

    it('allows ParishAdmin to create PARISH and CLASS targets within own parish', async () => {
      await expect(
        service.assertCanCreateAnnouncement(parishAdminId, {
          scopeType: AnnouncementScopeType.Parish,
          parishId,
          targets: [
            { targetType: CommunicationTargetType.Parish, parishId },
            { targetType: CommunicationTargetType.Class, classId },
          ],
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Catechist authority', () => {
    beforeEach(() => {
      (accessControlService.getRolesForUser as jest.Mock).mockResolvedValue([
        { code: 'CATECHIST' },
      ]);
      (parishScopeService.hasActiveParishMembership as jest.Mock).mockResolvedValue(false);
      (classCatechistAssignmentService.listAssignedClassIds as jest.Mock).mockResolvedValue([
        classId,
      ]);
      (classService.getClassById as jest.Mock).mockResolvedValue({
        id: classId,
        parishId,
      } as any);
    });

    it('allows Catechist to create CLASS-only target for actively assigned class', async () => {
      await expect(
        service.assertCanCreateAnnouncement(catechistId, {
          scopeType: AnnouncementScopeType.Parish,
          parishId,
          targets: [{ targetType: CommunicationTargetType.Class, classId }],
        }),
      ).resolves.not.toThrow();
    });

    it('denies Catechist from creating PARISH target', async () => {
      await expect(
        service.assertCanCreateAnnouncement(catechistId, {
          scopeType: AnnouncementScopeType.Parish,
          parishId,
          targets: [{ targetType: CommunicationTargetType.Parish, parishId }],
        }),
      ).rejects.toThrow(AnnouncementTargetNotAllowedError);
    });

    it('denies Catechist from targeting unassigned class', async () => {
      const unassignedClassId = 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
      await expect(
        service.assertCanCreateAnnouncement(catechistId, {
          scopeType: AnnouncementScopeType.Parish,
          parishId,
          targets: [{ targetType: CommunicationTargetType.Class, classId: unassignedClassId }],
        }),
      ).rejects.toThrow(AnnouncementTargetNotAllowedError);
    });
  });

  describe('Parent/Student authority', () => {
    it('denies Parent/Student from creating announcements', async () => {
      (accessControlService.getRolesForUser as jest.Mock).mockResolvedValue([
        { code: 'PARENT' },
      ]);

      await expect(
        service.assertCanCreateAnnouncement('some-user-id', {
          scopeType: AnnouncementScopeType.Parish,
          parishId,
          targets: [{ targetType: CommunicationTargetType.Parish, parishId }],
        }),
      ).rejects.toThrow(AnnouncementAccessDeniedError);
    });
  });
});
