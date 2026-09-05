import { GamificationDemoSeedService } from './gamification-demo.seed.service';
import {
  GAMIFICATION_DEMO_BADGE_CODES,
  GAMIFICATION_DEMO_MILESTONE_CODES,
  GAMIFICATION_DEMO_MISSION_CODES,
  GAMIFICATION_DEMO_REWARD_RULE_CODES,
} from './gamification-demo.seed.constants';

describe('GamificationDemoSeedService unit & idempotency spec', () => {
  let authRbacSeedService: { run: jest.Mock };
  let parishAcademicSeedService: { run: jest.Mock };
  let classEnrollmentSeedService: { run: jest.Mock; parentEmail?: string; studentAlphaEmail?: string };
  let parishService: { listParishes: jest.Mock };
  let classService: { listClasses: jest.Mock };
  let studentService: { listStudents: jest.Mock };
  let enrollmentService: { listEnrollments: jest.Mock };
  let userAccountService: { getAccountSnapshotByEmail: jest.Mock };
  let gamificationService: {
    listRewardRules: jest.Mock;
    createRewardRule: jest.Mock;
    listBadgeDefinitions: jest.Mock;
    createBadgeDefinition: jest.Mock;
    listMilestoneDefinitions: jest.Mock;
    createMilestoneDefinition: jest.Mock;
    listMissionDefinitions: jest.Mock;
    createMissionDefinition: jest.Mock;
    activateMissionDefinition: jest.Mock;
    ingestRewardEvent: jest.Mock;
    awardBadgeManually: jest.Mock;
    listPointLedgerForStudent: jest.Mock;
    adjustStudentPoints: jest.Mock;
  };

  let service: GamificationDemoSeedService;

  beforeEach(() => {
    authRbacSeedService = { run: jest.fn().mockResolvedValue(undefined) };
    parishAcademicSeedService = { run: jest.fn().mockResolvedValue(undefined) };
    classEnrollmentSeedService = {
      run: jest.fn().mockResolvedValue(undefined),
      parentEmail: 'parent@local.catechism.test',
      studentAlphaEmail: 'student-alpha@local.catechism.test',
    };
    parishService = {
      listParishes: jest.fn().mockResolvedValue([
        { id: 'p-1', code: 'demo-parish', name: 'Demo Parish' },
      ]),
    };
    classService = {
      listClasses: jest.fn().mockResolvedValue([
        { id: 'c-1', code: 'demo-class-a', parishId: 'p-1' },
        { id: 'c-2', code: 'demo-class-b', parishId: 'p-1' },
      ]),
    };
    studentService = {
      listStudents: jest.fn().mockResolvedValue([
        { id: 's-alpha', fullName: 'Demo Student Alpha' },
        { id: 's-beta', fullName: 'Demo Student Beta' },
      ]),
    };
    enrollmentService = {
      listEnrollments: jest.fn().mockImplementation((input: { studentId: string; classId: string }) => {
        if (input.studentId === 's-alpha') {
          return Promise.resolve({
            items: [{ id: 'e-alpha', studentId: 's-alpha', classId: 'c-1', status: 'ACTIVE' }],
            total: 1,
          });
        }
        return Promise.resolve({
          items: [{ id: 'e-beta', studentId: 's-beta', classId: 'c-2', status: 'ACTIVE' }],
          total: 1,
        });
      }),
    };
    userAccountService = {
      getAccountSnapshotByEmail: jest.fn().mockImplementation((email: string) => {
        return Promise.resolve({ id: `user-${email}`, email });
      }),
    };
    gamificationService = {
      listRewardRules: jest.fn().mockResolvedValue([]),
      createRewardRule: jest.fn().mockResolvedValue({ id: 'rule-new' }),
      listBadgeDefinitions: jest.fn().mockResolvedValue([]),
      createBadgeDefinition: jest.fn().mockImplementation((input: { code: string }) => {
        return Promise.resolve({ id: `badge-${input.code}`, code: input.code });
      }),
      listMilestoneDefinitions: jest.fn().mockResolvedValue([]),
      createMilestoneDefinition: jest.fn().mockResolvedValue({ id: 'ms-new' }),
      listMissionDefinitions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      createMissionDefinition: jest.fn().mockImplementation((input: { code: string }) => {
        return Promise.resolve({ id: `mission-${input.code}`, code: input.code });
      }),
      activateMissionDefinition: jest.fn().mockImplementation((id: string) => {
        return Promise.resolve({ id, status: 'ACTIVE' });
      }),
      ingestRewardEvent: jest.fn().mockResolvedValue({
        alreadyProcessed: false,
        totalPointsAwarded: 10,
        pendingMissionCompletedEvents: [],
      }),
      awardBadgeManually: jest.fn().mockResolvedValue({
        award: { id: 'manual-award-1' },
        alreadyExisted: false,
      }),
      listPointLedgerForStudent: jest.fn().mockResolvedValue([]),
      adjustStudentPoints: jest.fn().mockResolvedValue({ id: 'ple-adj-1' }),
    };

    service = new GamificationDemoSeedService(
      authRbacSeedService as never,
      parishAcademicSeedService as never,
      classEnrollmentSeedService as never,
      parishService as never,
      classService as never,
      studentService as never,
      enrollmentService as never,
      userAccountService as never,
      gamificationService as never,
    );
  });

  it('runs initial seed and creates demo rules, badges, milestones, missions, and ledger events', async () => {
    const summary = await service.run();

    expect(authRbacSeedService.run).toHaveBeenCalledTimes(1);
    expect(parishAcademicSeedService.run).toHaveBeenCalledTimes(1);
    expect(classEnrollmentSeedService.run).toHaveBeenCalledTimes(1);

    expect(summary.rulesCreated).toBe(4);
    expect(summary.badgesCreated).toBe(2);
    expect(summary.milestonesCreated).toBe(2);
    expect(summary.missionsCreated).toBe(3);
    expect(summary.eventsProcessed).toBe(3);
    expect(summary.manualBadgesAwarded).toBe(1);
    expect(summary.pointsAdjusted).toBe(true);

    expect(summary.studentId).toBe('s-alpha');
    expect(summary.foreignStudentId).toBe('s-beta');
    expect(summary.enrollmentId).toBe('e-alpha');
    expect(summary.foreignEnrollmentId).toBe('e-beta');
  });

  it('is completely idempotent on second run (0 duplicate creates)', async () => {
    // Populate existing definitions
    gamificationService.listRewardRules.mockResolvedValue([
      { code: GAMIFICATION_DEMO_REWARD_RULE_CODES.lessonComplete10 },
      { code: GAMIFICATION_DEMO_REWARD_RULE_CODES.practiceComplete5 },
      { code: GAMIFICATION_DEMO_REWARD_RULE_CODES.attendancePresent5 },
      { code: GAMIFICATION_DEMO_REWARD_RULE_CODES.examComplete15 },
    ]);
    gamificationService.listBadgeDefinitions.mockResolvedValue([
      { id: 'b-1', code: GAMIFICATION_DEMO_BADGE_CODES.firstLesson },
      { id: 'b-2', code: GAMIFICATION_DEMO_BADGE_CODES.practiceExplorer },
    ]);
    gamificationService.listMilestoneDefinitions.mockResolvedValue([
      { id: 'm-1', code: GAMIFICATION_DEMO_MILESTONE_CODES.firstLesson },
      { id: 'm-2', code: GAMIFICATION_DEMO_MILESTONE_CODES.firstMission },
    ]);
    gamificationService.listMissionDefinitions.mockResolvedValue({
      items: [
        { id: 'mis-1', code: GAMIFICATION_DEMO_MISSION_CODES.complete3Lessons },
        { id: 'mis-2', code: GAMIFICATION_DEMO_MISSION_CODES.attend1Class },
        { id: 'mis-3', code: GAMIFICATION_DEMO_MISSION_CODES.scriptureDraft },
      ],
      total: 3,
    });
    gamificationService.ingestRewardEvent.mockResolvedValue({
      alreadyProcessed: true,
      totalPointsAwarded: 0,
      pendingMissionCompletedEvents: [],
    });
    gamificationService.awardBadgeManually.mockResolvedValue({
      award: { id: 'manual-award-1' },
      alreadyExisted: true,
    });
    gamificationService.listPointLedgerForStudent.mockResolvedValue([
      {
        id: 'ple-existing',
        staffNote: 'Demo: Active participation in community service and prayer',
      },
    ]);

    const summary = await service.run();

    expect(summary.rulesCreated).toBe(0);
    expect(summary.badgesCreated).toBe(0);
    expect(summary.milestonesCreated).toBe(0);
    expect(summary.missionsCreated).toBe(0);
    expect(summary.eventsProcessed).toBe(0);
    expect(summary.manualBadgesAwarded).toBe(0);
    expect(summary.pointsAdjusted).toBe(false);

    expect(gamificationService.createRewardRule).not.toHaveBeenCalled();
    expect(gamificationService.createBadgeDefinition).not.toHaveBeenCalled();
    expect(gamificationService.createMilestoneDefinition).not.toHaveBeenCalled();
    expect(gamificationService.createMissionDefinition).not.toHaveBeenCalled();
    expect(gamificationService.adjustStudentPoints).not.toHaveBeenCalled();
  });
});
