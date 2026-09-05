import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ParishMembershipService } from '../../parish/services/parish-membership.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { StudentService } from '../../student/services/student.service';
import { UserAccountService } from '../../users/services/user-account.service';
import { InvalidNotificationTargetError } from '../errors/notification.errors';
import { NotificationAudienceResolver } from './notification-audience.resolver';

describe('NotificationAudienceResolver', () => {
  let resolver: NotificationAudienceResolver;
  let userAccountService: jest.Mocked<UserAccountService>;
  let parishMembershipService: jest.Mocked<ParishMembershipService>;
  let classCatechistAssignmentService: jest.Mocked<ClassCatechistAssignmentService>;
  let enrollmentQueryService: jest.Mocked<EnrollmentQueryService>;
  let studentService: jest.Mocked<StudentService>;
  let studentGuardianService: jest.Mocked<StudentGuardianService>;
  let accessControlService: jest.Mocked<AccessControlService>;

  beforeEach(() => {
    userAccountService = {
      listActiveUserIds: jest.fn(),
    } as unknown as jest.Mocked<UserAccountService>;

    parishMembershipService = {
      listActiveUserIdsByParishId: jest.fn(),
    } as unknown as jest.Mocked<ParishMembershipService>;

    classCatechistAssignmentService = {
      listActiveCatechistUserIdsByClassId: jest.fn(),
    } as unknown as jest.Mocked<ClassCatechistAssignmentService>;

    enrollmentQueryService = {
      listActiveStudentIdsInClasses: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentQueryService>;

    studentService = {
      listLinkedUserIdsByStudentIds: jest.fn(),
    } as unknown as jest.Mocked<StudentService>;

    studentGuardianService = {
      listActiveGuardianUserIdsByStudentIds: jest.fn(),
    } as unknown as jest.Mocked<StudentGuardianService>;

    accessControlService = {
      listUserIdsByRoleCode: jest.fn(),
    } as unknown as jest.Mocked<AccessControlService>;

    resolver = new NotificationAudienceResolver(
      userAccountService,
      parishMembershipService,
      classCatechistAssignmentService,
      enrollmentQueryService,
      studentService,
      studentGuardianService,
      accessControlService,
    );
  });

  describe('expandTargets — GLOBAL', () => {
    it('enumerates active platform users in bounded pages until exhausted', async () => {
      const page1 = Array.from({ length: 500 }, (_, i) => `00000000-0000-0000-0000-00000000${String(i).padStart(4, '0')}`);
      const page2 = ['00000000-0000-0000-0000-000000009999'];

      userAccountService.listActiveUserIds
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await resolver.expandTargets([{ targetType: 'GLOBAL' }]);

      expect(userAccountService.listActiveUserIds).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(501);
      expect(result.has('00000000-0000-0000-0000-000000009999')).toBe(true);
    });
  });

  describe('expandTargets — PARISH', () => {
    it('resolves active parish member user IDs', async () => {
      const parishId = '11111111-1111-1111-1111-111111111111';
      parishMembershipService.listActiveUserIdsByParishId.mockResolvedValue([
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
      ]);

      const result = await resolver.expandTargets([{ targetType: 'PARISH', parishId }]);

      expect(parishMembershipService.listActiveUserIdsByParishId).toHaveBeenCalledWith(parishId);
      expect(result.size).toBe(2);
      expect(result.has('22222222-2222-2222-2222-222222222222')).toBe(true);
    });

    it('throws InvalidNotificationTargetError if parishId is not a valid UUID', async () => {
      await expect(
        resolver.expandTargets([{ targetType: 'PARISH', parishId: 'invalid-id' }]),
      ).rejects.toThrow(InvalidNotificationTargetError);
    });
  });

  describe('expandTargets — CLASS', () => {
    it('resolves catechists, enrolled students, and guardians, deduplicating overlaps', async () => {
      const classId = '44444444-4444-4444-4444-444444444444';
      const studentId1 = '55555555-5555-5555-5555-555555555551';
      const studentId2 = '55555555-5555-5555-5555-555555555552';

      const catechistUserId = '66666666-6666-6666-6666-666666666666';
      const studentUserId = '77777777-7777-7777-7777-777777777777';
      const guardianUserId = '88888888-8888-8888-8888-888888888888';

      classCatechistAssignmentService.listActiveCatechistUserIdsByClassId.mockResolvedValue([
        catechistUserId,
      ]);
      enrollmentQueryService.listActiveStudentIdsInClasses.mockResolvedValue([
        studentId1,
        studentId2,
      ]);
      studentService.listLinkedUserIdsByStudentIds.mockResolvedValue([studentUserId]);
      studentGuardianService.listActiveGuardianUserIdsByStudentIds.mockResolvedValue([
        guardianUserId,
        catechistUserId, // Catechist is also a parent
      ]);

      const result = await resolver.expandTargets([{ targetType: 'CLASS', classId }]);

      expect(result.size).toBe(3); // catechist, student, guardian (overlap deduped)
      expect(result.has(catechistUserId)).toBe(true);
      expect(result.has(studentUserId)).toBe(true);
      expect(result.has(guardianUserId)).toBe(true);
    });

    it('throws InvalidNotificationTargetError if classId is not a valid UUID', async () => {
      await expect(
        resolver.expandTargets([{ targetType: 'CLASS', classId: 'not-a-uuid' }]),
      ).rejects.toThrow(InvalidNotificationTargetError);
    });
  });

  describe('expandTargets — ROLE', () => {
    it('resolves exact intersection between users with role and users with active parish membership', async () => {
      const parishId = '11111111-1111-1111-1111-111111111111';
      const roleCode = 'PARISH_ADMIN';

      const userInBoth = '22222222-2222-2222-2222-222222222222';
      const userOnlyRole = '33333333-3333-3333-3333-333333333333';
      const userOnlyParish = '44444444-4444-4444-4444-444444444444';

      accessControlService.listUserIdsByRoleCode.mockResolvedValue([userInBoth, userOnlyRole]);
      parishMembershipService.listActiveUserIdsByParishId.mockResolvedValue([userInBoth, userOnlyParish]);

      const result = await resolver.expandTargets([
        { targetType: 'ROLE', parishId, roleCode },
      ]);

      expect(result.size).toBe(1);
      expect(result.has(userInBoth)).toBe(true);
      expect(result.has(userOnlyRole)).toBe(false);
      expect(result.has(userOnlyParish)).toBe(false);
    });

    it('throws InvalidNotificationTargetError if roleCode is empty or parishId invalid', async () => {
      await expect(
        resolver.expandTargets([
          { targetType: 'ROLE', parishId: 'invalid-id', roleCode: 'CATECHIST' },
        ]),
      ).rejects.toThrow(InvalidNotificationTargetError);

      await expect(
        resolver.expandTargets([
          { targetType: 'ROLE', parishId: '11111111-1111-1111-1111-111111111111', roleCode: '' },
        ]),
      ).rejects.toThrow(InvalidNotificationTargetError);
    });
  });
});
