import { Test, type TestingModule } from '@nestjs/testing';
import { StudentStatus } from '../enums/student-status.enum';
import { LearnerSelfScopeDeniedError } from '../errors/student-access.errors';
import { LearnerSelfScopeService } from './learner-self-scope.service';
import { StudentService } from './student.service';

describe('LearnerSelfScopeService', () => {
  let service: LearnerSelfScopeService;
  let studentService: jest.Mocked<Pick<StudentService, 'getStudentById'>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const studentId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    studentService = {
      getStudentById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [LearnerSelfScopeService, { provide: StudentService, useValue: studentService }],
    }).compile();

    service = moduleRef.get(LearnerSelfScopeService);
  });

  it('allows when the authenticated user is the linked student account', async () => {
    studentService.getStudentById.mockResolvedValue({
      id: studentId,
      userId,
      fullName: 'Demo Student Alpha',
      status: StudentStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.assertActingAsLinkedStudent(userId, studentId)).resolves.toBeUndefined();
    expect(await service.isActingAsLinkedStudent(userId, studentId)).toBe(true);
  });

  it('denies when the student profile has no linked user account', async () => {
    studentService.getStudentById.mockResolvedValue({
      id: studentId,
      userId: null,
      fullName: 'Unlinked Student',
      status: StudentStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.assertActingAsLinkedStudent(userId, studentId)).rejects.toBeInstanceOf(
      LearnerSelfScopeDeniedError,
    );
    expect(await service.isActingAsLinkedStudent(userId, studentId)).toBe(false);
  });

  it('denies when the authenticated user is not the linked student account', async () => {
    studentService.getStudentById.mockResolvedValue({
      id: studentId,
      userId: otherUserId,
      fullName: 'Demo Student Alpha',
      status: StudentStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.assertActingAsLinkedStudent(userId, studentId)).rejects.toBeInstanceOf(
      LearnerSelfScopeDeniedError,
    );
    expect(await service.isActingAsLinkedStudent(userId, studentId)).toBe(false);
  });
});
