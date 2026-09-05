import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import { StudentService } from '../../student/services/student.service';
import { AnnouncementAudienceResolver } from './announcement-audience.resolver';

describe('AnnouncementAudienceResolver', () => {
  let resolver: AnnouncementAudienceResolver;
  let parishScopeService: jest.Mocked<Partial<ParishScopeService>>;
  let accessControlService: jest.Mocked<Partial<AccessControlService>>;
  let classCatechistAssignmentService: jest.Mocked<Partial<ClassCatechistAssignmentService>>;
  let studentService: jest.Mocked<Partial<StudentService>>;
  let enrollmentQueryService: jest.Mocked<Partial<EnrollmentQueryService>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const parishId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const classId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';

  beforeEach(() => {
    parishScopeService = {
      listActiveParishIdsForMember: jest.fn().mockResolvedValue([parishId]),
    };
    accessControlService = {
      getRolesForUser: jest.fn().mockResolvedValue([{ code: 'CATECHIST' }]),
    };
    classCatechistAssignmentService = {
      listAssignedClassIds: jest.fn().mockResolvedValue([classId]),
    };
    studentService = {
      listStudentIdsByLinkedUserId: jest.fn().mockResolvedValue([]),
    };
    enrollmentQueryService = {
      listStudentIdsForGuardian: jest.fn().mockResolvedValue([]),
      listActiveEnrollmentsByStudentIds: jest.fn().mockResolvedValue([]),
    };

    resolver = new AnnouncementAudienceResolver(
      parishScopeService as ParishScopeService,
      accessControlService as AccessControlService,
      classCatechistAssignmentService as ClassCatechistAssignmentService,
      studentService as StudentService,
      enrollmentQueryService as EnrollmentQueryService,
    );
  });

  it('resolves GLOBAL, parish, role, and class keys for active catechist', async () => {
    const keys = await resolver.resolveAudienceKeys(userId);

    expect(keys).toContain('GLOBAL');
    expect(keys).toContain(`PARISH:${parishId.toLowerCase()}`);
    expect(keys).toContain(`ROLE:${parishId.toLowerCase()}:CATECHIST`);
    expect(keys).toContain(`CLASS:${classId.toLowerCase()}`);
  });

  it('resolves student enrolled class for student actor', async () => {
    (classCatechistAssignmentService.listAssignedClassIds as jest.Mock).mockResolvedValue([]);
    (studentService.listStudentIdsByLinkedUserId as jest.Mock).mockResolvedValue(['student-1']);
    (enrollmentQueryService.listActiveEnrollmentsByStudentIds as jest.Mock).mockResolvedValue([
      { classId },
    ]);

    const keys = await resolver.resolveAudienceKeys(userId);

    expect(keys).toContain('GLOBAL');
    expect(keys).toContain(`CLASS:${classId.toLowerCase()}`);
  });

  it('resolves guardian linked child enrolled class for parent actor', async () => {
    (classCatechistAssignmentService.listAssignedClassIds as jest.Mock).mockResolvedValue([]);
    (studentService.listStudentIdsByLinkedUserId as jest.Mock).mockResolvedValue([]);
    (enrollmentQueryService.listStudentIdsForGuardian as jest.Mock).mockResolvedValue([
      'child-student-1',
    ]);
    (enrollmentQueryService.listActiveEnrollmentsByStudentIds as jest.Mock).mockResolvedValue([
      { classId },
    ]);

    const keys = await resolver.resolveAudienceKeys(userId);

    expect(keys).toContain('GLOBAL');
    expect(keys).toContain(`CLASS:${classId.toLowerCase()}`);
  });
});
