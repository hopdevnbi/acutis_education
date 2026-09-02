import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassService } from '../../class/services/class.service';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { PracticeService } from '../../practice/services/practice.service';
import { ExamService } from '../../exam/services/exam.service';
import {
  LEARNING_PROGRESS_DEFAULT_LIMIT,
  LEARNING_PROGRESS_DEFAULT_PAGE,
  LEARNING_PROGRESS_MAX_LIMIT,
} from '../constants/learning-progress.constants';
import {
  LessonProgressPersistedStatus,
  LessonProgressStatus,
} from '../enums/lesson-progress-status.enum';
import {
  LearningProgressCanonicalLessonInvalidError,
  LearningProgressCanonicalLessonRequiresCurriculumError,
  LearningProgressCurriculumMismatchError,
} from '../errors/learning-progress.errors';
import type {
  ClassLearningProgressLearnerRow,
  ClassLearningProgressSnapshot,
  ClassLearningProgressSummary,
  EnrollmentLearningProgressSnapshot,
  EnrollmentLessonStateSnapshot,
  GetClassLearningProgressInput,
  GetEnrollmentLearningProgressInput,
  LearningDimensionMetrics,
  LearningProgressPracticeSnapshot,
} from '../interfaces/learning-progress.interface';
import { calculateCompletionRatio } from '../utils/learning-progress-ratio.util';
import { LearningProgressAccessService } from './learning-progress-access.service';

interface AssignedCurriculumContext {
  readonly curriculumId: string;
  readonly assignedCurriculumVersionId: string;
  readonly assignedLessonKeys: readonly string[];
}

interface PersistedLessonProgressRow {
  readonly enrollmentId: string;
  readonly canonicalLessonKey: string;
  readonly status: LessonProgressPersistedStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly updatedAt: Date;
  readonly assignedCurriculumVersionId: string;
}

interface NormalizedLearningProgressFilters {
  readonly curriculumId: string | null;
  readonly canonicalLessonKey: string | null;
}

@Injectable()
export class LearningProgressAggregationService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly enrollmentService: EnrollmentService,
    private readonly classService: ClassService,
    private readonly curriculumService: CurriculumService,
    private readonly practiceService: PracticeService,
    private readonly examService: ExamService,
    private readonly learningProgressAccessService: LearningProgressAccessService,
  ) {}

  async getEnrollmentLearningProgress(
    input: GetEnrollmentLearningProgressInput,
  ): Promise<EnrollmentLearningProgressSnapshot> {
    const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);

    await this.learningProgressAccessService.assertCanReadEnrollmentProgress(
      input.actorUserId,
      enrollment,
    );

    const filters = this.normalizeFilters(input);
    const context = await this.resolveEnrollmentCurriculumContext(enrollment);
    this.assertFiltersMatchContext(filters, context);

    const scopedKeys = this.resolveScopedLessonKeys(context, filters);
    const progressRows = await this.queryPersistedLessonProgressRows(
      [enrollment.id],
      context.curriculumId,
    );
    const progressByKey = this.buildProgressMap(progressRows, scopedKeys);
    const learning = this.buildLearningMetrics(context, scopedKeys, progressByKey);
    const lessons = this.synthesizeLessonStates(scopedKeys, progressByKey);
    const practiceSnapshot = await this.practiceService.getEnrollmentProgress({
      enrollmentId: enrollment.id,
      actorUserId: input.actorUserId,
      curriculumId: filters.curriculumId ?? undefined,
      canonicalLessonKey: filters.canonicalLessonKey ?? undefined,
    });
    const practice = this.toLearningPracticeSnapshot(practiceSnapshot);
    const exam = await this.examService.getEnrollmentExamSummary(enrollment.id);
    const lastLessonActivityAt = this.resolveLatestLessonActivityAt(progressRows, scopedKeys);

    return {
      enrollmentId: normalizeUuid(enrollment.id),
      filters,
      learning,
      lessons,
      practice,
      exam,
      lastLearningActivityAt: this.resolveLastLearningActivityAt(
        lastLessonActivityAt,
        practice.lastPracticedAt,
      ),
    };
  }

  async getClassLearningProgress(
    input: GetClassLearningProgressInput,
  ): Promise<ClassLearningProgressSnapshot> {
    await this.learningProgressAccessService.assertCanReadClassProgress(
      input.actorUserId,
      input.classId,
    );

    const classSnapshot = await this.classService.getClassById(input.classId);
    const filters = this.normalizeFilters(input);
    const page = input.page ?? LEARNING_PROGRESS_DEFAULT_PAGE;
    const limit = Math.min(
      input.limit ?? LEARNING_PROGRESS_DEFAULT_LIMIT,
      LEARNING_PROGRESS_MAX_LIMIT,
    );
    const context = await this.resolveClassCurriculumContext(classSnapshot);
    this.assertFiltersMatchContext(filters, context);

    const rosterEnrollments = await this.listAllActiveEnrollments(classSnapshot.id);
    const rosterEnrollmentIds = rosterEnrollments.map((item) => normalizeUuid(item.id));
    const scopedKeys = this.resolveScopedLessonKeys(context, filters);
    const allProgressRows = await this.queryPersistedLessonProgressRows(
      rosterEnrollmentIds,
      context.curriculumId,
    );
    const summaryBase = this.buildClassSummary(
      rosterEnrollments.length,
      scopedKeys,
      allProgressRows,
    );
    const practiceSnapshot = await this.practiceService.getClassProgress({
      classId: classSnapshot.id,
      actorUserId: input.actorUserId,
      page,
      limit,
      curriculumId: filters.curriculumId ?? undefined,
      canonicalLessonKey: filters.canonicalLessonKey ?? undefined,
    });
    const summary: ClassLearningProgressSummary = {
      ...summaryBase,
      practice: this.toClassSummaryPracticeSnapshot(practiceSnapshot.summary),
      lastLearningActivityAt: this.resolveLastLearningActivityAt(
        this.resolveLatestClassLessonActivityAt(allProgressRows, scopedKeys),
        practiceSnapshot.summary.lastPracticedAt,
      ),
    };

    const pagedEnrollments = await this.enrollmentService.listEnrollmentsByClass(classSnapshot.id, {
      page,
      limit,
      sortBy: 'enrolledAt',
      sort: 'ASC',
      status: EnrollmentStatus.Active,
    });
    const pageProgressRows = allProgressRows.filter((row) =>
      pagedEnrollments.items.some(
        (enrollment) => normalizeUuid(enrollment.id) === normalizeUuid(row.enrollmentId),
      ),
    );
    const practiceByEnrollmentId = new Map(
      practiceSnapshot.learners.items.map((row) => [normalizeUuid(row.enrollmentId), row]),
    );
    const items = pagedEnrollments.items.map((enrollment) =>
      this.buildClassLearnerRow(
        enrollment,
        scopedKeys,
        pageProgressRows,
        practiceByEnrollmentId.get(normalizeUuid(enrollment.id)),
      ),
    );

    return {
      classId: normalizeUuid(classSnapshot.id),
      filters,
      summary,
      learners: {
        items,
        page: pagedEnrollments.page,
        limit: pagedEnrollments.limit,
        total: pagedEnrollments.total,
        totalPages: pagedEnrollments.totalPages,
      },
    };
  }

  private normalizeFilters(input: {
    curriculumId?: string;
    canonicalLessonKey?: string;
  }): NormalizedLearningProgressFilters {
    const curriculumId =
      input.curriculumId === undefined ? null : normalizeUuid(input.curriculumId);
    const canonicalLessonKey =
      input.canonicalLessonKey === undefined ? null : normalizeUuid(input.canonicalLessonKey);

    if (canonicalLessonKey !== null && !isUuidV4(canonicalLessonKey)) {
      throw new LearningProgressCanonicalLessonInvalidError();
    }

    if (canonicalLessonKey !== null && curriculumId === null) {
      throw new LearningProgressCanonicalLessonRequiresCurriculumError();
    }

    if (curriculumId !== null && !isUuidV4(curriculumId)) {
      throw new LearningProgressCurriculumMismatchError();
    }

    return {
      curriculumId,
      canonicalLessonKey,
    };
  }

  private assertFiltersMatchContext(
    filters: NormalizedLearningProgressFilters,
    context: AssignedCurriculumContext,
  ): void {
    if (filters.curriculumId !== null && filters.curriculumId !== context.curriculumId) {
      throw new LearningProgressCurriculumMismatchError();
    }

    if (
      filters.canonicalLessonKey !== null &&
      !context.assignedLessonKeys.includes(filters.canonicalLessonKey)
    ) {
      throw new LearningProgressCanonicalLessonInvalidError();
    }
  }

  private resolveScopedLessonKeys(
    context: AssignedCurriculumContext,
    filters: NormalizedLearningProgressFilters,
  ): readonly string[] {
    if (filters.canonicalLessonKey !== null) {
      return [filters.canonicalLessonKey];
    }

    return context.assignedLessonKeys;
  }

  private async resolveEnrollmentCurriculumContext(
    enrollment: EnrollmentSnapshot,
  ): Promise<AssignedCurriculumContext> {
    if (enrollment.status === EnrollmentStatus.Active) {
      const classSnapshot = await this.classService.getClassById(enrollment.classId);

      return this.resolveClassCurriculumContext(classSnapshot);
    }

    const progressRows = await this.queryPersistedLessonProgressRows([enrollment.id]);

    if (progressRows.length === 0) {
      try {
        const classSnapshot = await this.classService.getClassById(enrollment.classId);
        const activeContext = await this.resolveClassCurriculumContext(classSnapshot);

        return {
          ...activeContext,
          assignedLessonKeys: [],
        };
      } catch {
        return {
          curriculumId: normalizeUuid(enrollment.id),
          assignedCurriculumVersionId: normalizeUuid(enrollment.id),
          assignedLessonKeys: [],
        };
      }
    }

    const versionId = normalizeUuid(progressRows[0].assignedCurriculumVersionId);
    const tree = await this.curriculumService.getVersionTree(versionId);

    return {
      curriculumId: normalizeUuid(tree.version.curriculumId),
      assignedCurriculumVersionId: normalizeUuid(tree.version.id),
      assignedLessonKeys: this.extractLessonKeys(tree.topics),
    };
  }

  private async resolveClassCurriculumContext(classSnapshot: {
    parishId: string;
    academicYearId: string;
    catechismLevelId: string;
  }): Promise<AssignedCurriculumContext> {
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );
    const tree = await this.curriculumService.getVersionTree(assignedVersion.id);

    return {
      curriculumId: normalizeUuid(assignedVersion.curriculumId),
      assignedCurriculumVersionId: normalizeUuid(assignedVersion.id),
      assignedLessonKeys: this.extractLessonKeys(tree.topics),
    };
  }

  private extractLessonKeys(
    topics: ReadonlyArray<{ lessons: ReadonlyArray<{ canonicalLessonKey: string }> }>,
  ): string[] {
    const keys = topics.flatMap((topic) =>
      topic.lessons.map((lesson) => normalizeUuid(lesson.canonicalLessonKey)),
    );

    return [...new Set(keys)];
  }

  private async queryPersistedLessonProgressRows(
    enrollmentIds: readonly string[],
    curriculumId?: string,
  ): Promise<PersistedLessonProgressRow[]> {
    if (enrollmentIds.length === 0) {
      return [];
    }

    const parameters: unknown[] = [...enrollmentIds];
    let curriculumClause = '';

    if (curriculumId !== undefined) {
      parameters.push(normalizeUuid(curriculumId));
      curriculumClause = `AND lp.curriculum_id = @${parameters.length - 1}`;
    }

    const placeholders = enrollmentIds.map((_, index) => `@${index}`).join(', ');
    const rows = await this.dataSource.query<
      Array<{
        enrollment_id: string;
        canonical_lesson_key: string;
        status: LessonProgressPersistedStatus;
        started_at: Date;
        completed_at: Date | null;
        updated_at: Date;
        assigned_curriculum_version_id: string;
      }>
    >(
      `
        SELECT
          lp.enrollment_id,
          lp.canonical_lesson_key,
          lp.status,
          lp.started_at,
          lp.completed_at,
          lp.updated_at,
          lp.assigned_curriculum_version_id
        FROM lesson_progress lp
        WHERE lp.enrollment_id IN (${placeholders})
        ${curriculumClause}
      `,
      parameters,
    );

    return rows.map((row) => ({
      enrollmentId: normalizeUuid(row.enrollment_id),
      canonicalLessonKey: normalizeUuid(row.canonical_lesson_key),
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
      assignedCurriculumVersionId: normalizeUuid(row.assigned_curriculum_version_id),
    }));
  }

  private buildProgressMap(
    rows: readonly PersistedLessonProgressRow[],
    scopedKeys: readonly string[],
  ): Map<string, PersistedLessonProgressRow> {
    const scopedKeySet = new Set(scopedKeys);
    const progressByKey = new Map<string, PersistedLessonProgressRow>();

    for (const row of rows) {
      if (!scopedKeySet.has(row.canonicalLessonKey)) {
        continue;
      }

      progressByKey.set(row.canonicalLessonKey, row);
    }

    return progressByKey;
  }

  private buildLearningMetrics(
    context: AssignedCurriculumContext,
    scopedKeys: readonly string[],
    progressByKey: ReadonlyMap<string, PersistedLessonProgressRow>,
  ): LearningDimensionMetrics {
    let lessonsStarted = 0;
    let lessonsCompleted = 0;

    for (const key of scopedKeys) {
      const row = progressByKey.get(key);

      if (row === undefined) {
        continue;
      }

      if (
        row.status === LessonProgressPersistedStatus.InProgress ||
        row.status === LessonProgressPersistedStatus.Completed
      ) {
        lessonsStarted += 1;
      }

      if (row.status === LessonProgressPersistedStatus.Completed) {
        lessonsCompleted += 1;
      }
    }

    const lessonsAssigned = scopedKeys.length;

    return {
      curriculumId: context.curriculumId,
      assignedCurriculumVersionId: context.assignedCurriculumVersionId,
      lessonsAssigned,
      lessonsStarted,
      lessonsCompleted,
      completionRatio: calculateCompletionRatio(lessonsCompleted, lessonsAssigned),
    };
  }

  private synthesizeLessonStates(
    scopedKeys: readonly string[],
    progressByKey: ReadonlyMap<string, PersistedLessonProgressRow>,
  ): EnrollmentLessonStateSnapshot[] {
    return scopedKeys.map((canonicalLessonKey) => {
      const row = progressByKey.get(canonicalLessonKey);

      if (row === undefined) {
        return {
          canonicalLessonKey,
          status: LessonProgressStatus.NotStarted,
          startedAt: null,
          completedAt: null,
        };
      }

      return {
        canonicalLessonKey,
        status:
          row.status === LessonProgressPersistedStatus.Completed
            ? LessonProgressStatus.Completed
            : LessonProgressStatus.InProgress,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
      };
    });
  }

  private buildClassSummary(
    learnersTotal: number,
    scopedKeys: readonly string[],
    progressRows: readonly PersistedLessonProgressRow[],
  ): Omit<ClassLearningProgressSummary, 'practice' | 'lastLearningActivityAt'> {
    const progressByEnrollment = new Map<string, Map<string, PersistedLessonProgressRow>>();

    for (const row of progressRows) {
      const enrollmentProgress =
        progressByEnrollment.get(row.enrollmentId) ?? new Map<string, PersistedLessonProgressRow>();
      enrollmentProgress.set(row.canonicalLessonKey, row);
      progressByEnrollment.set(row.enrollmentId, enrollmentProgress);
    }

    let lessonsStarted = 0;
    let lessonsCompleted = 0;
    let learnersWithLearningActivity = 0;

    for (const enrollmentProgress of progressByEnrollment.values()) {
      let enrollmentHasActivity = false;

      for (const key of scopedKeys) {
        const row = enrollmentProgress.get(key);

        if (row === undefined) {
          continue;
        }

        enrollmentHasActivity = true;

        if (
          row.status === LessonProgressPersistedStatus.InProgress ||
          row.status === LessonProgressPersistedStatus.Completed
        ) {
          lessonsStarted += 1;
        }

        if (row.status === LessonProgressPersistedStatus.Completed) {
          lessonsCompleted += 1;
        }
      }

      if (enrollmentHasActivity) {
        learnersWithLearningActivity += 1;
      }
    }

    const lessonAssignmentsTotal = learnersTotal * scopedKeys.length;

    return {
      learnersTotal,
      learnersWithLearningActivity,
      lessonAssignmentsTotal,
      lessonsStarted,
      lessonsCompleted,
      completionRatio: calculateCompletionRatio(lessonsCompleted, lessonAssignmentsTotal),
    };
  }

  private buildClassLearnerRow(
    enrollment: EnrollmentSnapshot,
    scopedKeys: readonly string[],
    progressRows: readonly PersistedLessonProgressRow[],
    practiceRow:
      | {
          sessionsCompleted: number;
          questionsAttempted: number;
          firstAttemptAccuracy: number;
          finalAccuracy: number;
          lastPracticedAt: Date | null;
        }
      | undefined,
  ): ClassLearningProgressLearnerRow {
    const enrollmentRows = progressRows.filter(
      (row) => normalizeUuid(row.enrollmentId) === normalizeUuid(enrollment.id),
    );
    const progressByKey = this.buildProgressMap(enrollmentRows, scopedKeys);
    const learningMetrics = this.buildLearningMetrics(
      {
        curriculumId: normalizeUuid('00000000-0000-4000-8000-000000000000'),
        assignedCurriculumVersionId: normalizeUuid('00000000-0000-4000-8000-000000000000'),
        assignedLessonKeys: scopedKeys,
      },
      scopedKeys,
      progressByKey,
    );
    const practice = practiceRow
      ? {
          standard: {
            sessionsCompleted: practiceRow.sessionsCompleted,
            questionsAttempted: practiceRow.questionsAttempted,
            firstAttemptCorrect: 0,
            finalCorrect: 0,
            firstAttemptAccuracy: practiceRow.firstAttemptAccuracy,
            finalAccuracy: practiceRow.finalAccuracy,
          },
          review: {
            sessionsCompleted: 0,
            questionsAttempted: 0,
            finalCorrect: 0,
            finalAccuracy: 0,
            uniqueQuestionVersionsReviewed: 0,
          },
          lastPracticedAt: practiceRow.lastPracticedAt,
        }
      : this.emptyPracticeSnapshot();

    return {
      enrollmentId: normalizeUuid(enrollment.id),
      studentId: normalizeUuid(enrollment.studentId),
      learning: {
        lessonsAssigned: learningMetrics.lessonsAssigned,
        lessonsStarted: learningMetrics.lessonsStarted,
        lessonsCompleted: learningMetrics.lessonsCompleted,
        completionRatio: learningMetrics.completionRatio,
      },
      practice,
      lastLearningActivityAt: this.resolveLastLearningActivityAt(
        this.resolveLatestLessonActivityAt(enrollmentRows, scopedKeys),
        practice.lastPracticedAt,
      ),
    };
  }

  private async listAllActiveEnrollments(classId: string): Promise<EnrollmentSnapshot[]> {
    const enrollments: EnrollmentSnapshot[] = [];
    let page = LEARNING_PROGRESS_DEFAULT_PAGE;

    while (true) {
      const result = await this.enrollmentService.listEnrollmentsByClass(classId, {
        page,
        limit: LEARNING_PROGRESS_MAX_LIMIT,
        sortBy: 'enrolledAt',
        sort: 'ASC',
        status: EnrollmentStatus.Active,
      });

      enrollments.push(...result.items);

      if (page >= result.totalPages) {
        break;
      }

      page += 1;
    }

    return enrollments;
  }

  private toClassSummaryPracticeSnapshot(summary: {
    sessionsCompleted: number;
    questionsAttempted: number;
    firstAttemptCorrect: number;
    finalCorrect: number;
    firstAttemptAccuracy: number;
    finalAccuracy: number;
    lastPracticedAt: Date | null;
  }): LearningProgressPracticeSnapshot {
    return {
      standard: {
        sessionsCompleted: summary.sessionsCompleted,
        questionsAttempted: summary.questionsAttempted,
        firstAttemptCorrect: summary.firstAttemptCorrect,
        finalCorrect: summary.finalCorrect,
        firstAttemptAccuracy: summary.firstAttemptAccuracy,
        finalAccuracy: summary.finalAccuracy,
      },
      review: {
        sessionsCompleted: 0,
        questionsAttempted: 0,
        finalCorrect: 0,
        finalAccuracy: 0,
        uniqueQuestionVersionsReviewed: 0,
      },
      lastPracticedAt: summary.lastPracticedAt,
    };
  }

  private toLearningPracticeSnapshot(snapshot: {
    standard: {
      sessionsCompleted: number;
      questionsAttempted: number;
      firstAttemptCorrect: number;
      finalCorrect: number;
      firstAttemptAccuracy: number;
      finalAccuracy: number;
    };
    review: {
      sessionsCompleted: number;
      questionsAttempted: number;
      finalCorrect: number;
      finalAccuracy: number;
      uniqueQuestionVersionsReviewed: number;
    };
    lastPracticedAt: Date | null;
  }): LearningProgressPracticeSnapshot {
    return {
      standard: {
        sessionsCompleted: snapshot.standard.sessionsCompleted,
        questionsAttempted: snapshot.standard.questionsAttempted,
        firstAttemptCorrect: snapshot.standard.firstAttemptCorrect,
        finalCorrect: snapshot.standard.finalCorrect,
        firstAttemptAccuracy: snapshot.standard.firstAttemptAccuracy,
        finalAccuracy: snapshot.standard.finalAccuracy,
      },
      review: {
        sessionsCompleted: snapshot.review.sessionsCompleted,
        questionsAttempted: snapshot.review.questionsAttempted,
        finalCorrect: snapshot.review.finalCorrect,
        finalAccuracy: snapshot.review.finalAccuracy,
        uniqueQuestionVersionsReviewed: snapshot.review.uniqueQuestionVersionsReviewed,
      },
      lastPracticedAt: snapshot.lastPracticedAt,
    };
  }

  private emptyPracticeSnapshot(): LearningProgressPracticeSnapshot {
    return {
      standard: {
        sessionsCompleted: 0,
        questionsAttempted: 0,
        firstAttemptCorrect: 0,
        finalCorrect: 0,
        firstAttemptAccuracy: 0,
        finalAccuracy: 0,
      },
      review: {
        sessionsCompleted: 0,
        questionsAttempted: 0,
        finalCorrect: 0,
        finalAccuracy: 0,
        uniqueQuestionVersionsReviewed: 0,
      },
      lastPracticedAt: null,
    };
  }

  private resolveLatestLessonActivityAt(
    rows: readonly PersistedLessonProgressRow[],
    scopedKeys: readonly string[],
  ): Date | null {
    const scopedKeySet = new Set(scopedKeys);
    let latest: Date | null = null;

    for (const row of rows) {
      if (!scopedKeySet.has(row.canonicalLessonKey)) {
        continue;
      }

      if (latest === null || row.updatedAt.getTime() > latest.getTime()) {
        latest = row.updatedAt;
      }
    }

    return latest;
  }

  private resolveLatestClassLessonActivityAt(
    rows: readonly PersistedLessonProgressRow[],
    scopedKeys: readonly string[],
  ): Date | null {
    return this.resolveLatestLessonActivityAt(rows, scopedKeys);
  }

  private resolveLastLearningActivityAt(
    lessonActivityAt: Date | null,
    practiceActivityAt: Date | null,
  ): Date | null {
    if (lessonActivityAt === null) {
      return practiceActivityAt;
    }

    if (practiceActivityAt === null) {
      return lessonActivityAt;
    }

    return lessonActivityAt.getTime() >= practiceActivityAt.getTime()
      ? lessonActivityAt
      : practiceActivityAt;
  }
}
