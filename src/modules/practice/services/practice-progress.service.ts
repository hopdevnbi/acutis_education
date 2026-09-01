import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassService } from '../../class/services/class.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import {
  PRACTICE_PROGRESS_DEFAULT_LIMIT,
  PRACTICE_PROGRESS_DEFAULT_PAGE,
  PRACTICE_PROGRESS_MAX_LIMIT,
} from '../constants/practice-progress.constants';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionType } from '../enums/practice-session-type.enum';
import {
  PracticeProgressCanonicalLessonRequiresCurriculumError,
  PracticeProgressInvalidDateRangeError,
} from '../errors/practice.errors';
import type {
  ClassPracticeProgressLearnerRow,
  ClassPracticeProgressSnapshot,
  ClassPracticeProgressSummary,
  EnrollmentPracticeProgressSnapshot,
  GetClassPracticeProgressInput,
  GetEnrollmentPracticeProgressInput,
  PracticeProgressFilters,
  PracticeProgressReviewMetrics,
  PracticeProgressStandardMetrics,
} from '../interfaces/practice-progress.interface';
import { calculatePracticeAccuracy } from '../utils/practice-progress-accuracy.util';
import { PracticeAccessService } from './practice-access.service';

interface SessionCountRow {
  inProgressSessions: number;
  abandonedSessions: number;
  standardSessionsCompleted: number;
  reviewSessionsCompleted: number;
}

interface StandardMetricRow {
  totalQuestions: number;
  questionsAttempted: number;
  firstAttemptCorrect: number;
  finalCorrect: number;
}

interface ReviewMetricRow {
  questionsAttempted: number;
  finalCorrect: number;
  uniqueQuestionVersionsReviewed: number;
}

interface LastPracticedRow {
  lastPracticedAt: Date | null;
}

interface ClassLearnerMetricRow {
  enrollmentId: string;
  studentId: string;
  sessionsCompleted: number;
  questionsAttempted: number;
  firstAttemptCorrect: number;
  finalCorrect: number;
  totalQuestions: number;
  lastPracticedAt: Date | null;
}

interface ClassSummaryMetricRow {
  learnersWithPractice: number;
  sessionsCompleted: number;
  questionsAttempted: number;
  firstAttemptCorrect: number;
  finalCorrect: number;
  totalQuestions: number;
  lastPracticedAt: Date | null;
}

@Injectable()
export class PracticeProgressService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly enrollmentService: EnrollmentService,
    private readonly classService: ClassService,
    private readonly practiceAccessService: PracticeAccessService,
  ) {}

  async getEnrollmentProgress(
    input: GetEnrollmentPracticeProgressInput,
  ): Promise<EnrollmentPracticeProgressSnapshot> {
    const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);

    await this.practiceAccessService.assertCanReadEnrollmentProgress(input.actorUserId, enrollment);

    const filters = this.normalizeFilters(input);
    const sessionCounts = await this.querySessionCounts([enrollment.id], filters);
    const standardMetrics = await this.queryStandardMetrics([enrollment.id], filters);
    const reviewMetrics = await this.queryReviewMetrics([enrollment.id], filters);
    const lastPracticedAt = await this.queryLastPracticedAt([enrollment.id], filters);

    return {
      enrollmentId: enrollment.id,
      filters,
      standard: this.buildStandardMetrics(sessionCounts, standardMetrics),
      review: this.buildReviewMetrics(sessionCounts, reviewMetrics),
      lastPracticedAt,
    };
  }

  async getClassProgress(
    input: GetClassPracticeProgressInput,
  ): Promise<ClassPracticeProgressSnapshot> {
    await this.practiceAccessService.assertCanReadClassProgress(input.actorUserId, input.classId);

    const classSnapshot = await this.classService.getClassById(input.classId);
    const filters = this.normalizeFilters(input);
    const page = input.page ?? PRACTICE_PROGRESS_DEFAULT_PAGE;
    const limit = Math.min(
      input.limit ?? PRACTICE_PROGRESS_DEFAULT_LIMIT,
      PRACTICE_PROGRESS_MAX_LIMIT,
    );

    const enrollmentList = await this.enrollmentService.listEnrollmentsByClass(classSnapshot.id, {
      page,
      limit,
      sortBy: 'enrolledAt',
      sort: 'ASC',
      status: EnrollmentStatus.Active,
    });

    const enrollmentIds = enrollmentList.items.map((item) => item.id);
    const summaryRow = await this.queryClassSummaryMetrics(classSnapshot.id, filters);
    const learnerRows =
      enrollmentIds.length === 0 ? [] : await this.queryClassLearnerMetrics(enrollmentIds, filters);

    const learnersByEnrollmentId = new Map(
      learnerRows.map((row) => [normalizeUuid(row.enrollmentId), row]),
    );

    const items: ClassPracticeProgressLearnerRow[] = enrollmentList.items.map((enrollment) => {
      const metrics = learnersByEnrollmentId.get(normalizeUuid(enrollment.id));

      if (metrics === undefined) {
        return {
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          sessionsCompleted: 0,
          questionsAttempted: 0,
          firstAttemptAccuracy: 0,
          finalAccuracy: 0,
          lastPracticedAt: null,
        };
      }

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        sessionsCompleted: metrics.sessionsCompleted,
        questionsAttempted: metrics.questionsAttempted,
        firstAttemptAccuracy: calculatePracticeAccuracy(
          metrics.firstAttemptCorrect,
          metrics.totalQuestions,
        ),
        finalAccuracy: calculatePracticeAccuracy(metrics.finalCorrect, metrics.totalQuestions),
        lastPracticedAt: metrics.lastPracticedAt,
      };
    });

    return {
      classId: classSnapshot.id,
      filters,
      summary: this.buildClassSummary(summaryRow),
      learners: {
        items,
        page: enrollmentList.page,
        limit: enrollmentList.limit,
        total: enrollmentList.total,
        totalPages: enrollmentList.totalPages,
      },
    };
  }

  private normalizeFilters(
    input: Pick<
      GetEnrollmentPracticeProgressInput,
      'curriculumId' | 'canonicalLessonKey' | 'from' | 'to'
    >,
  ): PracticeProgressFilters {
    const curriculumId =
      input.curriculumId !== undefined && isUuidV4(input.curriculumId)
        ? normalizeUuid(input.curriculumId)
        : null;
    const canonicalLessonKey =
      input.canonicalLessonKey !== undefined && isUuidV4(input.canonicalLessonKey)
        ? normalizeUuid(input.canonicalLessonKey)
        : null;

    if (canonicalLessonKey !== null && curriculumId === null) {
      throw new PracticeProgressCanonicalLessonRequiresCurriculumError();
    }

    const from = input.from !== undefined ? new Date(input.from) : null;
    const to = input.to !== undefined ? new Date(input.to) : null;

    if (from !== null && Number.isNaN(from.getTime())) {
      throw new PracticeProgressInvalidDateRangeError();
    }

    if (to !== null && Number.isNaN(to.getTime())) {
      throw new PracticeProgressInvalidDateRangeError();
    }

    if (from !== null && to !== null && from.getTime() > to.getTime()) {
      throw new PracticeProgressInvalidDateRangeError();
    }

    return {
      curriculumId,
      canonicalLessonKey,
      from,
      to,
    };
  }

  private buildStandardMetrics(
    sessionCounts: SessionCountRow,
    standardMetrics: StandardMetricRow,
  ): PracticeProgressStandardMetrics {
    return {
      sessionsCompleted: sessionCounts.standardSessionsCompleted,
      inProgressSessions: sessionCounts.inProgressSessions,
      abandonedSessions: sessionCounts.abandonedSessions,
      questionsAttempted: standardMetrics.questionsAttempted,
      firstAttemptCorrect: standardMetrics.firstAttemptCorrect,
      finalCorrect: standardMetrics.finalCorrect,
      firstAttemptAccuracy: calculatePracticeAccuracy(
        standardMetrics.firstAttemptCorrect,
        standardMetrics.totalQuestions,
      ),
      finalAccuracy: calculatePracticeAccuracy(
        standardMetrics.finalCorrect,
        standardMetrics.totalQuestions,
      ),
    };
  }

  private buildReviewMetrics(
    sessionCounts: SessionCountRow,
    reviewMetrics: ReviewMetricRow,
  ): PracticeProgressReviewMetrics {
    return {
      sessionsCompleted: sessionCounts.reviewSessionsCompleted,
      questionsAttempted: reviewMetrics.questionsAttempted,
      finalCorrect: reviewMetrics.finalCorrect,
      finalAccuracy: calculatePracticeAccuracy(
        reviewMetrics.finalCorrect,
        reviewMetrics.questionsAttempted,
      ),
      uniqueQuestionVersionsReviewed: reviewMetrics.uniqueQuestionVersionsReviewed,
    };
  }

  private buildClassSummary(summaryRow: ClassSummaryMetricRow): ClassPracticeProgressSummary {
    return {
      learnersWithPractice: summaryRow.learnersWithPractice,
      sessionsCompleted: summaryRow.sessionsCompleted,
      questionsAttempted: summaryRow.questionsAttempted,
      firstAttemptCorrect: summaryRow.firstAttemptCorrect,
      finalCorrect: summaryRow.finalCorrect,
      firstAttemptAccuracy: calculatePracticeAccuracy(
        summaryRow.firstAttemptCorrect,
        summaryRow.totalQuestions,
      ),
      finalAccuracy: calculatePracticeAccuracy(summaryRow.finalCorrect, summaryRow.totalQuestions),
      lastPracticedAt: summaryRow.lastPracticedAt,
    };
  }

  private async querySessionCounts(
    enrollmentIds: readonly string[],
    filters: PracticeProgressFilters,
  ): Promise<SessionCountRow> {
    if (enrollmentIds.length === 0) {
      return {
        inProgressSessions: 0,
        abandonedSessions: 0,
        standardSessionsCompleted: 0,
        reviewSessionsCompleted: 0,
      };
    }

    const rows = await this.queryRows<SessionCountRow>(
      `
      SELECT
        SUM(CASE WHEN ps.session_type = @0 AND ps.status = @1 THEN 1 ELSE 0 END) AS inProgressSessions,
        SUM(CASE WHEN ps.session_type = @0 AND ps.status = @2 THEN 1 ELSE 0 END) AS abandonedSessions,
        SUM(CASE WHEN ps.session_type = @0 AND ps.status = @3 THEN 1 ELSE 0 END) AS standardSessionsCompleted,
        SUM(CASE WHEN ps.session_type = @4 AND ps.status = @3 THEN 1 ELSE 0 END) AS reviewSessionsCompleted
      FROM practice_sessions ps
      WHERE ps.enrollment_id IN (${this.buildInClausePlaceholders(enrollmentIds.length, 5)})
        AND (@${5 + enrollmentIds.length} IS NULL OR ps.curriculum_id = @${5 + enrollmentIds.length})
        AND (@${6 + enrollmentIds.length} IS NULL OR ps.canonical_lesson_key = @${6 + enrollmentIds.length})
        AND (@${7 + enrollmentIds.length} IS NULL OR ps.started_at >= @${7 + enrollmentIds.length})
        AND (@${8 + enrollmentIds.length} IS NULL OR ps.started_at <= @${8 + enrollmentIds.length})
    `,
      [
        PracticeSessionType.Standard,
        PracticeSessionStatus.InProgress,
        PracticeSessionStatus.Abandoned,
        PracticeSessionStatus.Completed,
        PracticeSessionType.ReviewWrong,
        ...enrollmentIds,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return {
      inProgressSessions: Number(rows[0]?.inProgressSessions ?? 0),
      abandonedSessions: Number(rows[0]?.abandonedSessions ?? 0),
      standardSessionsCompleted: Number(rows[0]?.standardSessionsCompleted ?? 0),
      reviewSessionsCompleted: Number(rows[0]?.reviewSessionsCompleted ?? 0),
    };
  }

  private async queryStandardMetrics(
    enrollmentIds: readonly string[],
    filters: PracticeProgressFilters,
  ): Promise<StandardMetricRow> {
    if (enrollmentIds.length === 0) {
      return {
        totalQuestions: 0,
        questionsAttempted: 0,
        firstAttemptCorrect: 0,
        finalCorrect: 0,
      };
    }

    const baseIndex = 2;
    const rows = await this.queryRows<StandardMetricRow>(
      `
      WITH filtered_sessions AS (
        SELECT ps.id
        FROM practice_sessions ps
        WHERE ps.enrollment_id IN (${this.buildInClausePlaceholders(enrollmentIds.length, baseIndex)})
          AND ps.session_type = @0
          AND ps.status = @1
          AND (@${baseIndex + enrollmentIds.length} IS NULL OR ps.curriculum_id = @${baseIndex + enrollmentIds.length})
          AND (@${baseIndex + enrollmentIds.length + 1} IS NULL OR ps.canonical_lesson_key = @${baseIndex + enrollmentIds.length + 1})
          AND (@${baseIndex + enrollmentIds.length + 2} IS NULL OR ps.started_at >= @${baseIndex + enrollmentIds.length + 2})
          AND (@${baseIndex + enrollmentIds.length + 3} IS NULL OR ps.started_at <= @${baseIndex + enrollmentIds.length + 3})
      ),
      completed_questions AS (
        SELECT psq.id
        FROM practice_session_questions psq
        INNER JOIN filtered_sessions fs ON fs.id = psq.practice_session_id
      ),
      first_attempts AS (
        SELECT
          paa.practice_session_question_id,
          paa.is_correct,
          ROW_NUMBER() OVER (
            PARTITION BY paa.practice_session_question_id
            ORDER BY paa.attempt_number ASC
          ) AS row_num
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      ),
      latest_attempts AS (
        SELECT
          paa.practice_session_question_id,
          paa.is_correct,
          ROW_NUMBER() OVER (
            PARTITION BY paa.practice_session_question_id
            ORDER BY paa.attempt_number DESC
          ) AS row_num
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      ),
      attempted_questions AS (
        SELECT DISTINCT paa.practice_session_question_id
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      )
      SELECT
        (SELECT COUNT(*) FROM completed_questions) AS totalQuestions,
        (SELECT COUNT(*) FROM attempted_questions) AS questionsAttempted,
        (SELECT COUNT(*) FROM first_attempts WHERE row_num = 1 AND is_correct = 1) AS firstAttemptCorrect,
        (SELECT COUNT(*) FROM latest_attempts WHERE row_num = 1 AND is_correct = 1) AS finalCorrect
    `,
      [
        PracticeSessionType.Standard,
        PracticeSessionStatus.Completed,
        ...enrollmentIds,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return {
      totalQuestions: Number(rows[0]?.totalQuestions ?? 0),
      questionsAttempted: Number(rows[0]?.questionsAttempted ?? 0),
      firstAttemptCorrect: Number(rows[0]?.firstAttemptCorrect ?? 0),
      finalCorrect: Number(rows[0]?.finalCorrect ?? 0),
    };
  }

  private async queryReviewMetrics(
    enrollmentIds: readonly string[],
    filters: PracticeProgressFilters,
  ): Promise<ReviewMetricRow> {
    if (enrollmentIds.length === 0) {
      return {
        questionsAttempted: 0,
        finalCorrect: 0,
        uniqueQuestionVersionsReviewed: 0,
      };
    }

    const baseIndex = 2;
    const rows = await this.queryRows<ReviewMetricRow>(
      `
      WITH filtered_sessions AS (
        SELECT ps.id
        FROM practice_sessions ps
        WHERE ps.enrollment_id IN (${this.buildInClausePlaceholders(enrollmentIds.length, baseIndex)})
          AND ps.session_type = @0
          AND ps.status = @1
          AND (@${baseIndex + enrollmentIds.length} IS NULL OR ps.curriculum_id = @${baseIndex + enrollmentIds.length})
          AND (@${baseIndex + enrollmentIds.length + 1} IS NULL OR ps.canonical_lesson_key = @${baseIndex + enrollmentIds.length + 1})
          AND (@${baseIndex + enrollmentIds.length + 2} IS NULL OR ps.started_at >= @${baseIndex + enrollmentIds.length + 2})
          AND (@${baseIndex + enrollmentIds.length + 3} IS NULL OR ps.started_at <= @${baseIndex + enrollmentIds.length + 3})
      ),
      completed_questions AS (
        SELECT psq.id, psq.question_version_id
        FROM practice_session_questions psq
        INNER JOIN filtered_sessions fs ON fs.id = psq.practice_session_id
      ),
      latest_attempts AS (
        SELECT
          paa.practice_session_question_id,
          paa.is_correct,
          ROW_NUMBER() OVER (
            PARTITION BY paa.practice_session_question_id
            ORDER BY paa.attempt_number DESC
          ) AS row_num
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      )
      SELECT
        (SELECT COUNT(*) FROM completed_questions) AS questionsAttempted,
        (SELECT COUNT(*) FROM latest_attempts WHERE row_num = 1 AND is_correct = 1) AS finalCorrect,
        (SELECT COUNT(DISTINCT question_version_id) FROM completed_questions) AS uniqueQuestionVersionsReviewed
    `,
      [
        PracticeSessionType.ReviewWrong,
        PracticeSessionStatus.Completed,
        ...enrollmentIds,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return {
      questionsAttempted: Number(rows[0]?.questionsAttempted ?? 0),
      finalCorrect: Number(rows[0]?.finalCorrect ?? 0),
      uniqueQuestionVersionsReviewed: Number(rows[0]?.uniqueQuestionVersionsReviewed ?? 0),
    };
  }

  private async queryLastPracticedAt(
    enrollmentIds: readonly string[],
    filters: PracticeProgressFilters,
  ): Promise<Date | null> {
    if (enrollmentIds.length === 0) {
      return null;
    }

    const baseIndex = 0;
    const rows = await this.queryRows<LastPracticedRow>(
      `
      SELECT MAX(paa.submitted_at) AS lastPracticedAt
      FROM practice_answer_attempts paa
      INNER JOIN practice_session_questions psq ON psq.id = paa.practice_session_question_id
      INNER JOIN practice_sessions ps ON ps.id = psq.practice_session_id
      WHERE ps.enrollment_id IN (${this.buildInClausePlaceholders(enrollmentIds.length, baseIndex)})
        AND (@${baseIndex + enrollmentIds.length} IS NULL OR ps.curriculum_id = @${baseIndex + enrollmentIds.length})
        AND (@${baseIndex + enrollmentIds.length + 1} IS NULL OR ps.canonical_lesson_key = @${baseIndex + enrollmentIds.length + 1})
        AND (@${baseIndex + enrollmentIds.length + 2} IS NULL OR ps.started_at >= @${baseIndex + enrollmentIds.length + 2})
        AND (@${baseIndex + enrollmentIds.length + 3} IS NULL OR ps.started_at <= @${baseIndex + enrollmentIds.length + 3})
    `,
      [
        ...enrollmentIds,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return rows[0]?.lastPracticedAt ?? null;
  }

  private async queryClassSummaryMetrics(
    classId: string,
    filters: PracticeProgressFilters,
  ): Promise<ClassSummaryMetricRow> {
    const sessionCounts = await this.querySessionCountsForClass(classId, filters);
    const standardMetrics = await this.queryStandardMetricsForClass(classId, filters);
    const lastPracticedAt = await this.queryLastPracticedAtForClass(classId, filters);
    const learnersWithPractice = await this.queryLearnersWithPracticeCountForClass(
      classId,
      filters,
    );

    return {
      learnersWithPractice,
      sessionsCompleted: sessionCounts.standardSessionsCompleted,
      questionsAttempted: standardMetrics.questionsAttempted,
      firstAttemptCorrect: standardMetrics.firstAttemptCorrect,
      finalCorrect: standardMetrics.finalCorrect,
      totalQuestions: standardMetrics.totalQuestions,
      lastPracticedAt,
    };
  }

  private async querySessionCountsForClass(
    classId: string,
    filters: PracticeProgressFilters,
  ): Promise<SessionCountRow> {
    const rows = await this.queryRows<SessionCountRow>(
      `
      SELECT
        SUM(CASE WHEN ps.session_type = @0 AND ps.status = @1 THEN 1 ELSE 0 END) AS inProgressSessions,
        SUM(CASE WHEN ps.session_type = @0 AND ps.status = @2 THEN 1 ELSE 0 END) AS abandonedSessions,
        SUM(CASE WHEN ps.session_type = @0 AND ps.status = @3 THEN 1 ELSE 0 END) AS standardSessionsCompleted,
        SUM(CASE WHEN ps.session_type = @4 AND ps.status = @3 THEN 1 ELSE 0 END) AS reviewSessionsCompleted
      FROM practice_sessions ps
      INNER JOIN enrollments e ON e.id = ps.enrollment_id
      WHERE e.class_id = @5
        AND e.status = @6
        AND (@7 IS NULL OR ps.curriculum_id = @7)
        AND (@8 IS NULL OR ps.canonical_lesson_key = @8)
        AND (@9 IS NULL OR ps.started_at >= @9)
        AND (@10 IS NULL OR ps.started_at <= @10)
    `,
      [
        PracticeSessionType.Standard,
        PracticeSessionStatus.InProgress,
        PracticeSessionStatus.Abandoned,
        PracticeSessionStatus.Completed,
        PracticeSessionType.ReviewWrong,
        classId,
        EnrollmentStatus.Active,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return {
      inProgressSessions: Number(rows[0]?.inProgressSessions ?? 0),
      abandonedSessions: Number(rows[0]?.abandonedSessions ?? 0),
      standardSessionsCompleted: Number(rows[0]?.standardSessionsCompleted ?? 0),
      reviewSessionsCompleted: Number(rows[0]?.reviewSessionsCompleted ?? 0),
    };
  }

  private async queryStandardMetricsForClass(
    classId: string,
    filters: PracticeProgressFilters,
  ): Promise<StandardMetricRow> {
    const rows = await this.queryRows<StandardMetricRow>(
      `
      WITH filtered_sessions AS (
        SELECT ps.id
        FROM practice_sessions ps
        INNER JOIN enrollments e ON e.id = ps.enrollment_id
        WHERE e.class_id = @2
          AND e.status = @3
          AND ps.session_type = @0
          AND ps.status = @1
          AND (@4 IS NULL OR ps.curriculum_id = @4)
          AND (@5 IS NULL OR ps.canonical_lesson_key = @5)
          AND (@6 IS NULL OR ps.started_at >= @6)
          AND (@7 IS NULL OR ps.started_at <= @7)
      ),
      completed_questions AS (
        SELECT psq.id
        FROM practice_session_questions psq
        INNER JOIN filtered_sessions fs ON fs.id = psq.practice_session_id
      ),
      first_attempts AS (
        SELECT
          paa.practice_session_question_id,
          paa.is_correct,
          ROW_NUMBER() OVER (
            PARTITION BY paa.practice_session_question_id
            ORDER BY paa.attempt_number ASC
          ) AS row_num
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      ),
      latest_attempts AS (
        SELECT
          paa.practice_session_question_id,
          paa.is_correct,
          ROW_NUMBER() OVER (
            PARTITION BY paa.practice_session_question_id
            ORDER BY paa.attempt_number DESC
          ) AS row_num
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      ),
      attempted_questions AS (
        SELECT DISTINCT paa.practice_session_question_id
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      )
      SELECT
        (SELECT COUNT(*) FROM completed_questions) AS totalQuestions,
        (SELECT COUNT(*) FROM attempted_questions) AS questionsAttempted,
        (SELECT COUNT(*) FROM first_attempts WHERE row_num = 1 AND is_correct = 1) AS firstAttemptCorrect,
        (SELECT COUNT(*) FROM latest_attempts WHERE row_num = 1 AND is_correct = 1) AS finalCorrect
    `,
      [
        PracticeSessionType.Standard,
        PracticeSessionStatus.Completed,
        classId,
        EnrollmentStatus.Active,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return {
      totalQuestions: Number(rows[0]?.totalQuestions ?? 0),
      questionsAttempted: Number(rows[0]?.questionsAttempted ?? 0),
      firstAttemptCorrect: Number(rows[0]?.firstAttemptCorrect ?? 0),
      finalCorrect: Number(rows[0]?.finalCorrect ?? 0),
    };
  }

  private async queryLastPracticedAtForClass(
    classId: string,
    filters: PracticeProgressFilters,
  ): Promise<Date | null> {
    const rows = await this.queryRows<LastPracticedRow>(
      `
      SELECT MAX(paa.submitted_at) AS lastPracticedAt
      FROM practice_answer_attempts paa
      INNER JOIN practice_session_questions psq ON psq.id = paa.practice_session_question_id
      INNER JOIN practice_sessions ps ON ps.id = psq.practice_session_id
      INNER JOIN enrollments e ON e.id = ps.enrollment_id
      WHERE e.class_id = @0
        AND e.status = @1
        AND (@2 IS NULL OR ps.curriculum_id = @2)
        AND (@3 IS NULL OR ps.canonical_lesson_key = @3)
        AND (@4 IS NULL OR ps.started_at >= @4)
        AND (@5 IS NULL OR ps.started_at <= @5)
    `,
      [
        classId,
        EnrollmentStatus.Active,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return rows[0]?.lastPracticedAt ?? null;
  }

  private async queryLearnersWithPracticeCountForClass(
    classId: string,
    filters: PracticeProgressFilters,
  ): Promise<number> {
    const rows = await this.queryRows<Pick<ClassSummaryMetricRow, 'learnersWithPractice'>>(
      `
      SELECT COUNT(DISTINCT ps.enrollment_id) AS learnersWithPractice
      FROM practice_sessions ps
      INNER JOIN enrollments e ON e.id = ps.enrollment_id
      WHERE e.class_id = @0
        AND e.status = @1
        AND (@2 IS NULL OR ps.curriculum_id = @2)
        AND (@3 IS NULL OR ps.canonical_lesson_key = @3)
        AND (@4 IS NULL OR ps.started_at >= @4)
        AND (@5 IS NULL OR ps.started_at <= @5)
    `,
      [
        classId,
        EnrollmentStatus.Active,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return Number(rows[0]?.learnersWithPractice ?? 0);
  }

  private async queryClassLearnerMetrics(
    enrollmentIds: readonly string[],
    filters: PracticeProgressFilters,
  ): Promise<ClassLearnerMetricRow[]> {
    const baseIndex = 2;
    const rows = await this.queryRows<ClassLearnerMetricRow>(
      `
      WITH filtered_sessions AS (
        SELECT ps.id, ps.enrollment_id
        FROM practice_sessions ps
        WHERE ps.enrollment_id IN (${this.buildInClausePlaceholders(enrollmentIds.length, baseIndex)})
          AND ps.session_type = @0
          AND ps.status = @1
          AND (@${baseIndex + enrollmentIds.length} IS NULL OR ps.curriculum_id = @${baseIndex + enrollmentIds.length})
          AND (@${baseIndex + enrollmentIds.length + 1} IS NULL OR ps.canonical_lesson_key = @${baseIndex + enrollmentIds.length + 1})
          AND (@${baseIndex + enrollmentIds.length + 2} IS NULL OR ps.started_at >= @${baseIndex + enrollmentIds.length + 2})
          AND (@${baseIndex + enrollmentIds.length + 3} IS NULL OR ps.started_at <= @${baseIndex + enrollmentIds.length + 3})
      ),
      completed_questions AS (
        SELECT psq.id, fs.enrollment_id
        FROM practice_session_questions psq
        INNER JOIN filtered_sessions fs ON fs.id = psq.practice_session_id
      ),
      first_attempts AS (
        SELECT
          cq.enrollment_id,
          paa.practice_session_question_id,
          paa.is_correct,
          ROW_NUMBER() OVER (
            PARTITION BY paa.practice_session_question_id
            ORDER BY paa.attempt_number ASC
          ) AS row_num
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      ),
      latest_attempts AS (
        SELECT
          cq.enrollment_id,
          paa.practice_session_question_id,
          paa.is_correct,
          ROW_NUMBER() OVER (
            PARTITION BY paa.practice_session_question_id
            ORDER BY paa.attempt_number DESC
          ) AS row_num
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      ),
      attempted_questions AS (
        SELECT DISTINCT cq.enrollment_id, paa.practice_session_question_id
        FROM practice_answer_attempts paa
        INNER JOIN completed_questions cq ON cq.id = paa.practice_session_question_id
      ),
      session_counts AS (
        SELECT enrollment_id, COUNT(*) AS sessionsCompleted
        FROM filtered_sessions
        GROUP BY enrollment_id
      ),
      question_totals AS (
        SELECT enrollment_id, COUNT(*) AS totalQuestions
        FROM completed_questions
        GROUP BY enrollment_id
      ),
      attempted_counts AS (
        SELECT enrollment_id, COUNT(*) AS questionsAttempted
        FROM attempted_questions
        GROUP BY enrollment_id
      ),
      first_correct_counts AS (
        SELECT enrollment_id, COUNT(*) AS firstAttemptCorrect
        FROM first_attempts
        WHERE row_num = 1 AND is_correct = 1
        GROUP BY enrollment_id
      ),
      final_correct_counts AS (
        SELECT enrollment_id, COUNT(*) AS finalCorrect
        FROM latest_attempts
        WHERE row_num = 1 AND is_correct = 1
        GROUP BY enrollment_id
      ),
      last_practiced AS (
        SELECT ps.enrollment_id, MAX(paa.submitted_at) AS lastPracticedAt
        FROM practice_answer_attempts paa
        INNER JOIN practice_session_questions psq ON psq.id = paa.practice_session_question_id
        INNER JOIN practice_sessions ps ON ps.id = psq.practice_session_id
        WHERE ps.enrollment_id IN (${this.buildInClausePlaceholders(enrollmentIds.length, baseIndex)})
          AND (@${baseIndex + enrollmentIds.length} IS NULL OR ps.curriculum_id = @${baseIndex + enrollmentIds.length})
          AND (@${baseIndex + enrollmentIds.length + 1} IS NULL OR ps.canonical_lesson_key = @${baseIndex + enrollmentIds.length + 1})
          AND (@${baseIndex + enrollmentIds.length + 2} IS NULL OR ps.started_at >= @${baseIndex + enrollmentIds.length + 2})
          AND (@${baseIndex + enrollmentIds.length + 3} IS NULL OR ps.started_at <= @${baseIndex + enrollmentIds.length + 3})
        GROUP BY ps.enrollment_id
      )
      SELECT
        e.id AS enrollmentId,
        e.student_id AS studentId,
        COALESCE(sc.sessionsCompleted, 0) AS sessionsCompleted,
        COALESCE(ac.questionsAttempted, 0) AS questionsAttempted,
        COALESCE(fc.firstAttemptCorrect, 0) AS firstAttemptCorrect,
        COALESCE(fcc.finalCorrect, 0) AS finalCorrect,
        COALESCE(qt.totalQuestions, 0) AS totalQuestions,
        lp.lastPracticedAt
      FROM enrollments e
      LEFT JOIN session_counts sc ON sc.enrollment_id = e.id
      LEFT JOIN question_totals qt ON qt.enrollment_id = e.id
      LEFT JOIN attempted_counts ac ON ac.enrollment_id = e.id
      LEFT JOIN first_correct_counts fc ON fc.enrollment_id = e.id
      LEFT JOIN final_correct_counts fcc ON fcc.enrollment_id = e.id
      LEFT JOIN last_practiced lp ON lp.enrollment_id = e.id
      WHERE e.id IN (${this.buildInClausePlaceholders(enrollmentIds.length, baseIndex)})
    `,
      [
        PracticeSessionType.Standard,
        PracticeSessionStatus.Completed,
        ...enrollmentIds,
        filters.curriculumId,
        filters.canonicalLessonKey,
        filters.from,
        filters.to,
      ],
    );

    return rows;
  }

  private buildInClausePlaceholders(count: number, startIndex: number): string {
    return Array.from({ length: count }, (_, index) => `@${startIndex + index}`).join(', ');
  }

  private async queryRows<T>(sql: string, parameters: readonly unknown[]): Promise<T[]> {
    const result: unknown = await this.dataSource.query(sql, [...parameters]);

    if (!Array.isArray(result)) {
      return [];
    }

    return result as T[];
  }
}
