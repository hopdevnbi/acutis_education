import { Injectable, Logger } from '@nestjs/common';
import { REWARD_EVENT_TYPES, type RewardEligibleEvent } from '../../modules/application-events/contracts/reward-eligible-event.contract';
import { ClassService } from '../../modules/class/services/class.service';
import { EnrollmentService } from '../../modules/enrollment/services/enrollment.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { StudentService } from '../../modules/student/services/student.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import {
  BadgeAwardMode,
  BadgeDefinitionStatus,
  BadgeRuleType,
  BadgeScopeType,
  MilestoneDefinitionStatus,
  MilestoneTriggerType,
  MissionConditionType,
  MissionDefinitionStatus,
  MissionScopeType,
  PointSourceType,
  RewardRuleStatus,
  RewardScopeType,
} from '../../modules/gamification/enums/gamification.enums';
import { GamificationService } from '../../modules/gamification/gamification.service';
import { AuthRbacSeedService } from './auth-rbac.seed.service';
import {
  CLASS_ENROLLMENT_DEMO_CLASS_A_CODE,
  CLASS_ENROLLMENT_DEMO_CLASS_B_CODE,
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME,
  CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME,
} from './class-enrollment.seed.constants';
import { ClassEnrollmentSeedService } from './class-enrollment.seed.service';
import {
  GAMIFICATION_DEMO_BADGE_CODES,
  GAMIFICATION_DEMO_CATECHIST_EMAIL,
  GAMIFICATION_DEMO_DETERMINISTIC_EVENT_IDS,
  GAMIFICATION_DEMO_MANUAL_ADJUSTMENT,
  GAMIFICATION_DEMO_MILESTONE_CODES,
  GAMIFICATION_DEMO_MISSION_CODES,
  GAMIFICATION_DEMO_PARISH_ADMIN_EMAIL,
  GAMIFICATION_DEMO_REWARD_RULE_CODES,
  GAMIFICATION_DEMO_SAMPLE_PASSWORD,
  GAMIFICATION_DEMO_SUPER_ADMIN_EMAIL,
} from './gamification-demo.seed.constants';
import { ParishAcademicSeedService } from './parish-academic.seed.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from './parish-academic.seed.constants';

export class GamificationDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GamificationDemoSeedPrerequisiteError';
  }
}

export interface GamificationDemoSeedSummary {
  readonly superAdminEmail: string;
  readonly parishAdminEmail: string;
  readonly catechistEmail: string;
  readonly parentEmail: string;
  readonly studentEmail: string;
  readonly samplePassword: string;
  readonly studentId: string;
  readonly foreignStudentId: string;
  readonly enrollmentId: string;
  readonly foreignEnrollmentId: string;
  readonly classId: string;
  readonly rulesCreated: number;
  readonly badgesCreated: number;
  readonly milestonesCreated: number;
  readonly missionsCreated: number;
  readonly eventsProcessed: number;
  readonly manualBadgesAwarded: number;
  readonly pointsAdjusted: boolean;
}

@Injectable()
export class GamificationDemoSeedService {
  private readonly logger = new Logger(GamificationDemoSeedService.name);

  constructor(
    private readonly authRbacSeedService: AuthRbacSeedService,
    private readonly parishAcademicSeedService: ParishAcademicSeedService,
    private readonly classEnrollmentSeedService: ClassEnrollmentSeedService,
    private readonly parishService: ParishService,
    private readonly classService: ClassService,
    private readonly studentService: StudentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userAccountService: UserAccountService,
    private readonly gamificationService: GamificationService,
  ) {}

  async run(): Promise<GamificationDemoSeedSummary> {
    this.logger.log('Starting Gamification + Faith Journey demo seed.');

    // 1. Run prerequisite seed chains
    await this.authRbacSeedService.run();
    await this.parishAcademicSeedService.run();
    await this.classEnrollmentSeedService.run();

    // 2. Discover deterministic foundation entities
    const parish = await this.findDemoParish();
    const demoClassA = await this.findDemoClass(parish.id, CLASS_ENROLLMENT_DEMO_CLASS_A_CODE);
    const demoClassB = await this.findDemoClass(parish.id, CLASS_ENROLLMENT_DEMO_CLASS_B_CODE);

    const superAdmin = await this.requireUser(GAMIFICATION_DEMO_SUPER_ADMIN_EMAIL);
    const parishAdmin = await this.requireUser(GAMIFICATION_DEMO_PARISH_ADMIN_EMAIL);
    const catechist = await this.requireUser(GAMIFICATION_DEMO_CATECHIST_EMAIL);
    const parent = await this.requireUser(this.classEnrollmentSeedService.parentEmail ?? 'parent@local.catechism.test');
    const studentUser = await this.requireUser(this.classEnrollmentSeedService.studentAlphaEmail ?? 'student-alpha@local.catechism.test');

    const alphaStudent = await this.findStudentByName(CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME);
    const betaStudent = await this.findStudentByName(CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME);

    const primaryEnrollment = await this.findActiveEnrollment(alphaStudent.id, demoClassA.id);
    const foreignEnrollment = await this.findActiveEnrollment(betaStudent.id, demoClassB.id);

    // 3. Ensure Reward Rules
    let rulesCreated = 0;
    const existingRules = await this.gamificationService.listRewardRules({ includeGlobal: true });
    const existingRuleCodes = new Set(existingRules.map((r) => r.code));

    if (!existingRuleCodes.has(GAMIFICATION_DEMO_REWARD_RULE_CODES.lessonComplete10)) {
      await this.gamificationService.createRewardRule({
        code: GAMIFICATION_DEMO_REWARD_RULE_CODES.lessonComplete10,
        eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
        sourceType: PointSourceType.LessonCompleted,
        points: 10,
        scopeType: RewardScopeType.Global,
        status: RewardRuleStatus.Active,
      });
      rulesCreated += 1;
    }

    if (!existingRuleCodes.has(GAMIFICATION_DEMO_REWARD_RULE_CODES.practiceComplete5)) {
      await this.gamificationService.createRewardRule({
        code: GAMIFICATION_DEMO_REWARD_RULE_CODES.practiceComplete5,
        eventType: REWARD_EVENT_TYPES.PracticeCompleted,
        sourceType: PointSourceType.PracticeCompleted,
        points: 5,
        scopeType: RewardScopeType.Global,
        status: RewardRuleStatus.Active,
      });
      rulesCreated += 1;
    }

    if (!existingRuleCodes.has(GAMIFICATION_DEMO_REWARD_RULE_CODES.attendancePresent5)) {
      await this.gamificationService.createRewardRule({
        code: GAMIFICATION_DEMO_REWARD_RULE_CODES.attendancePresent5,
        eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
        sourceType: PointSourceType.AttendancePresent,
        points: 5,
        scopeType: RewardScopeType.Global,
        status: RewardRuleStatus.Active,
      });
      rulesCreated += 1;
    }

    if (!existingRuleCodes.has(GAMIFICATION_DEMO_REWARD_RULE_CODES.examComplete15)) {
      await this.gamificationService.createRewardRule({
        code: GAMIFICATION_DEMO_REWARD_RULE_CODES.examComplete15,
        eventType: REWARD_EVENT_TYPES.ExamCompleted,
        sourceType: PointSourceType.ExamCompleted,
        points: 15,
        scopeType: RewardScopeType.Global,
        status: RewardRuleStatus.Active,
      });
      rulesCreated += 1;
    }

    // 4. Ensure Badge Definitions
    let badgesCreated = 0;
    const existingBadges = await this.gamificationService.listBadgeDefinitions({ includeGlobal: true });
    const existingBadgeMap = new Map(existingBadges.map((b) => [b.code, b]));

    let firstLessonBadge = existingBadgeMap.get(GAMIFICATION_DEMO_BADGE_CODES.firstLesson);
    if (!firstLessonBadge) {
      firstLessonBadge = await this.gamificationService.createBadgeDefinition({
        code: GAMIFICATION_DEMO_BADGE_CODES.firstLesson,
        name: 'First Step of Faith',
        description: 'Completed your first catechism lesson with joyful devotion',
        category: 'LEARNING',
        scopeType: BadgeScopeType.Global,
        status: BadgeDefinitionStatus.Active,
        awardMode: BadgeAwardMode.Automatic,
        ruleEventType: BadgeRuleType.FirstLessonCompleted,
        pointsBonus: 10,
      });
      badgesCreated += 1;
    }

    let practiceExplorerBadge = existingBadgeMap.get(GAMIFICATION_DEMO_BADGE_CODES.practiceExplorer);
    if (!practiceExplorerBadge) {
      practiceExplorerBadge = await this.gamificationService.createBadgeDefinition({
        code: GAMIFICATION_DEMO_BADGE_CODES.practiceExplorer,
        name: 'Practice Explorer',
        description: 'Diligent review and practice of sacred catechism questions',
        category: 'PRACTICE',
        scopeType: BadgeScopeType.Global,
        status: BadgeDefinitionStatus.Active,
        awardMode: BadgeAwardMode.Both,
        ruleEventType: BadgeRuleType.PracticeCompletedCount,
        ruleConfigJson: JSON.stringify({ targetCount: 1 }),
        pointsBonus: 15,
      });
      badgesCreated += 1;
    }

    // 5. Ensure Milestone Definitions
    let milestonesCreated = 0;
    const existingMilestones = await this.gamificationService.listMilestoneDefinitions();
    const existingMilestoneCodes = new Set(existingMilestones.map((m) => m.code));

    if (!existingMilestoneCodes.has(GAMIFICATION_DEMO_MILESTONE_CODES.firstLesson)) {
      await this.gamificationService.createMilestoneDefinition({
        code: GAMIFICATION_DEMO_MILESTONE_CODES.firstLesson,
        name: 'First Lesson Journey',
        description: 'Embarked on the journey of faith learning',
        status: MilestoneDefinitionStatus.Active,
        triggerType: MilestoneTriggerType.FirstLessonCompleted,
        sortOrder: 1,
      });
      milestonesCreated += 1;
    }

    if (!existingMilestoneCodes.has(GAMIFICATION_DEMO_MILESTONE_CODES.firstMission)) {
      await this.gamificationService.createMilestoneDefinition({
        code: GAMIFICATION_DEMO_MILESTONE_CODES.firstMission,
        name: 'Mission Pioneer',
        description: 'Successfully completed first parish mission challenge',
        status: MilestoneDefinitionStatus.Active,
        triggerType: MilestoneTriggerType.FirstMissionCompleted,
        sortOrder: 2,
      });
      milestonesCreated += 1;
    }

    // 6. Ensure Mission Definitions
    let missionsCreated = 0;
    const existingMissionsResult = await this.gamificationService.listMissionDefinitions({ page: 1, limit: 100 });
    const existingMissionMap = new Map(existingMissionsResult.items.map((m) => [m.code, m]));

    let complete3LessonsMission = existingMissionMap.get(GAMIFICATION_DEMO_MISSION_CODES.complete3Lessons);
    if (!complete3LessonsMission) {
      complete3LessonsMission = await this.gamificationService.createMissionDefinition({
        code: GAMIFICATION_DEMO_MISSION_CODES.complete3Lessons,
        name: 'Complete 3 Lessons',
        description: 'Complete 3 catechism lessons to strengthen knowledge of the faith',
        scopeType: MissionScopeType.Global,
        conditionType: MissionConditionType.LessonsCompleted,
        targetCount: 3,
        pointsBonus: 25,
      });
      complete3LessonsMission = await this.gamificationService.activateMissionDefinition(complete3LessonsMission.id);
      missionsCreated += 1;
    }

    let attend1ClassMission = existingMissionMap.get(GAMIFICATION_DEMO_MISSION_CODES.attend1Class);
    if (!attend1ClassMission) {
      attend1ClassMission = await this.gamificationService.createMissionDefinition({
        code: GAMIFICATION_DEMO_MISSION_CODES.attend1Class,
        name: 'Faithful Attendance',
        description: 'Attend a scheduled class session faithfully',
        scopeType: MissionScopeType.Class,
        parishId: parish.id,
        classId: demoClassA.id,
        conditionType: MissionConditionType.AttendancePresentOrLate,
        targetCount: 1,
        pointsBonus: 10,
      });
      attend1ClassMission = await this.gamificationService.activateMissionDefinition(attend1ClassMission.id);
      missionsCreated += 1;
    }

    let scriptureDraftMission = existingMissionMap.get(GAMIFICATION_DEMO_MISSION_CODES.scriptureDraft);
    if (!scriptureDraftMission) {
      await this.gamificationService.createMissionDefinition({
        code: GAMIFICATION_DEMO_MISSION_CODES.scriptureDraft,
        name: 'Explore Holy Scripture (Draft)',
        description: 'Draft mission for upcoming Sunday liturgy preparation',
        scopeType: MissionScopeType.Class,
        parishId: parish.id,
        classId: demoClassA.id,
        conditionType: MissionConditionType.PracticeCompleted,
        targetCount: 2,
        pointsBonus: 20,
      });
      missionsCreated += 1;
    }

    // 7. Ingest Deterministic Reward Events
    let eventsProcessed = 0;

    // Event 1: Lesson Completed
    const lessonEvent: RewardEligibleEvent = {
      eventId: GAMIFICATION_DEMO_DETERMINISTIC_EVENT_IDS.lesson1,
      eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
      occurredAt: new Date('2026-09-01T09:00:00Z'),
      studentId: alphaStudent.id,
      enrollmentId: primaryEnrollment.id,
      classId: demoClassA.id,
      parishId: parish.id,
      sourceId: 'demo-source-lesson-1',
    };
    const res1 = await this.gamificationService.ingestRewardEvent(lessonEvent);
    if (!res1.alreadyProcessed) {
      eventsProcessed += 1;
    }

    // Event 2: Attendance Completed Mark (triggers mission completion + bonus)
    const attendanceEvent: RewardEligibleEvent = {
      eventId: GAMIFICATION_DEMO_DETERMINISTIC_EVENT_IDS.attendance1,
      eventType: REWARD_EVENT_TYPES.AttendanceSessionCompletedMark,
      occurredAt: new Date('2026-09-02T10:00:00Z'),
      studentId: alphaStudent.id,
      enrollmentId: primaryEnrollment.id,
      classId: demoClassA.id,
      parishId: parish.id,
      sourceId: 'demo-source-attendance-1',
      metadata: { attendanceStatus: 'PRESENT' },
    };
    const res2 = await this.gamificationService.ingestRewardEvent(attendanceEvent);
    if (!res2.alreadyProcessed) {
      eventsProcessed += 1;
      // Ingest completion event if published
      for (const pending of res2.pendingMissionCompletedEvents) {
        await this.gamificationService.ingestRewardEvent(pending);
      }
    }

    // Event 3: Practice Completed
    const practiceEvent: RewardEligibleEvent = {
      eventId: GAMIFICATION_DEMO_DETERMINISTIC_EVENT_IDS.practice1,
      eventType: REWARD_EVENT_TYPES.PracticeCompleted,
      occurredAt: new Date('2026-09-03T11:00:00Z'),
      studentId: alphaStudent.id,
      enrollmentId: primaryEnrollment.id,
      classId: demoClassA.id,
      parishId: parish.id,
      sourceId: 'demo-source-practice-1',
    };
    const res3 = await this.gamificationService.ingestRewardEvent(practiceEvent);
    if (!res3.alreadyProcessed) {
      eventsProcessed += 1;
    }

    // 8. Manual Badge Award
    let manualBadgesAwarded = 0;
    const manualAwardRes = await this.gamificationService.awardBadgeManually({
      actorUserId: catechist.id,
      studentId: alphaStudent.id,
      badgeId: practiceExplorerBadge.id,
    });
    if (!manualAwardRes.alreadyExisted) {
      manualBadgesAwarded += 1;
    }

    // 9. Manual Point Adjustment
    let pointsAdjusted = false;
    const existingLedger = await this.gamificationService.listPointLedgerForStudent(alphaStudent.id, { take: 50 });
    const hasManualAdjustment = existingLedger.some(
      (e) => e.staffNote === GAMIFICATION_DEMO_MANUAL_ADJUSTMENT.reason,
    );
    if (!hasManualAdjustment) {
      await this.gamificationService.adjustStudentPoints({
        studentId: alphaStudent.id,
        actorUserId: parishAdmin.id,
        delta: GAMIFICATION_DEMO_MANUAL_ADJUSTMENT.delta,
        reason: GAMIFICATION_DEMO_MANUAL_ADJUSTMENT.reason,
      });
      pointsAdjusted = true;
    }

    this.logger.log('Gamification + Faith Journey demo seed complete.');

    return {
      superAdminEmail: superAdmin.email,
      parishAdminEmail: parishAdmin.email,
      catechistEmail: catechist.email,
      parentEmail: parent.email,
      studentEmail: studentUser.email,
      samplePassword: GAMIFICATION_DEMO_SAMPLE_PASSWORD,
      studentId: alphaStudent.id,
      foreignStudentId: betaStudent.id,
      enrollmentId: primaryEnrollment.id,
      foreignEnrollmentId: foreignEnrollment.id,
      classId: demoClassA.id,
      rulesCreated,
      badgesCreated,
      milestonesCreated,
      missionsCreated,
      eventsProcessed,
      manualBadgesAwarded,
      pointsAdjusted,
    };
  }

  private async findDemoParish() {
    const parishes = await this.parishService.listParishes();
    const parish = parishes.find((p) => p.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE);
    if (!parish) {
      throw new GamificationDemoSeedPrerequisiteError('Sample parish not found. Re-run parish seed.');
    }
    return parish;
  }

  private async findDemoClass(parishId: string, classCode: string) {
    const classes = await this.classService.listClasses({ parishId });
    const match = classes.find((c) => c.code === classCode);
    if (!match) {
      throw new GamificationDemoSeedPrerequisiteError(`Class with code ${classCode} not found.`);
    }
    return match;
  }

  private async findStudentByName(fullName: string) {
    const students = await this.studentService.listStudents();
    const match = students.find((s) => s.fullName === fullName);
    if (!match) {
      throw new GamificationDemoSeedPrerequisiteError(`Student with name ${fullName} not found.`);
    }
    return match;
  }

  private async findActiveEnrollment(studentId: string, classId: string) {
    const list = await this.enrollmentService.listEnrollments({ studentId, classId });
    const match = list.items.find((e) => e.status === 'ACTIVE');
    if (!match) {
      throw new GamificationDemoSeedPrerequisiteError(
        `Active enrollment for studentId ${studentId} in classId ${classId} not found.`,
      );
    }
    return match;
  }

  private async requireUser(email: string) {
    const account = await this.userAccountService.getAccountSnapshotByEmail(email);
    if (!account) {
      throw new GamificationDemoSeedPrerequisiteError(`Seed user with email ${email} not found.`);
    }
    return account;
  }
}
