import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { ParishService } from '../../parish/services/parish.service';
import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { QuestionStatus } from '../../question-bank/enums/question-status.enum';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { DEFAULT_EXAM_REVIEW_POLICY } from '../constants/exam-review-policy.constants';
import { ExamVersionQuestionEntity } from '../entities/exam-version-question.entity';
import { ExamVersionEntity } from '../entities/exam-version.entity';
import { ExamEntity } from '../entities/exam.entity';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamStatus } from '../enums/exam-status.enum';
import { ExamVersionStatus } from '../enums/exam-version-status.enum';
import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import {
  ExamCodeAlreadyExistsError,
  ExamDraftAlreadyExistsError,
  ExamInactiveError,
  ExamNotFoundError,
  ExamQuestionParishMismatchError,
  ExamSourceLocaleImmutableError,
  ExamUpdateRequiresFieldsError,
  ExamVersionExamMismatchError,
  ExamVersionNotCloneableError,
  ExamVersionNotDraftError,
  ExamVersionNotFoundError,
  ExamVersionNumberConflictError,
  ExamVersionUpdateRequiresFieldsError,
  InvalidExamDurationError,
  InvalidExamIdError,
  InvalidExamMaxAttemptsError,
  InvalidExamPassingScoreError,
  InvalidExamVersionIdError,
  InvalidExamVersionQuestionsError,
} from '../errors/exam.errors';
import type {
  CreateExamInput,
  CreateExamVersionInput,
  EnrollmentExamSummarySnapshot,
  ExamPublishValidationIssue,
  ExamSnapshot,
  ExamVersionQuestionSnapshot,
  ExamVersionSnapshot,
  ListExamsInput,
  ListExamsResult,
  ListExamVersionsInput,
  ReplaceExamVersionQuestionsInput,
  UpdateExamInput,
  UpdateExamVersionInput,
} from '../interfaces/exam.interface';
import {
  toExamSnapshot,
  toExamVersionQuestionSnapshot,
  toExamVersionSnapshot,
} from '../mappers/exam.mapper';
import { parseExamCode } from '../utils/exam-code.util';
import { parseExamReviewPolicy, serializeExamReviewPolicy } from '../utils/exam-review-policy.util';
import { parseExamSourceLocale } from '../utils/exam-source-locale.util';
import {
  parseExamDescription,
  parseExamInstructions,
  parseExamTitle,
} from '../utils/exam-text.util';

function escapeLikePattern(value: string): string {
  return value.replace(/[%_[\\]/g, '\\$&');
}

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepository: Repository<ExamEntity>,
    @InjectRepository(ExamVersionEntity)
    private readonly examVersionRepository: Repository<ExamVersionEntity>,
    @InjectRepository(ExamVersionQuestionEntity)
    private readonly examVersionQuestionRepository: Repository<ExamVersionQuestionEntity>,
    @InjectRepository(ExamAssignmentEntity)
    private readonly examAssignmentRepository: Repository<ExamAssignmentEntity>,
    @InjectRepository(ExamAttemptEntity)
    private readonly examAttemptRepository: Repository<ExamAttemptEntity>,
    private readonly parishService: ParishService,
    private readonly enrollmentService: EnrollmentService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly questionBankService: QuestionBankService,
  ) {}

  async getEnrollmentExamSummary(rawEnrollmentId: string): Promise<EnrollmentExamSummarySnapshot> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);
    const summaries = await this.buildEnrollmentExamSummaries([enrollment]);

    return summaries.get(enrollment.id)!;
  }

  async getEnrollmentExamSummariesByEnrollmentIds(
    rawEnrollmentIds: readonly string[],
  ): Promise<Map<string, EnrollmentExamSummarySnapshot>> {
    const enrollments =
      await this.enrollmentQueryService.getEnrollmentSnapshotsByIds(rawEnrollmentIds);

    return this.buildEnrollmentExamSummaries(enrollments);
  }

  private async buildEnrollmentExamSummaries(
    enrollments: readonly EnrollmentSnapshot[],
  ): Promise<Map<string, EnrollmentExamSummarySnapshot>> {
    const summaries = new Map<string, EnrollmentExamSummarySnapshot>();

    if (enrollments.length === 0) {
      return summaries;
    }

    const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
    const classIds = [...new Set(enrollments.map((enrollment) => enrollment.classId))];
    const [assignmentCountsByClassId, gradedAttemptStatsByEnrollmentId] = await Promise.all([
      this.countExamAssignmentsByClassIds(classIds),
      this.getGradedAttemptStatsByEnrollmentIds(enrollmentIds),
    ]);

    for (const enrollment of enrollments) {
      const gradedAttemptStats = gradedAttemptStatsByEnrollmentId.get(enrollment.id);

      summaries.set(enrollment.id, {
        assignmentsAvailable: assignmentCountsByClassId.get(enrollment.classId) ?? 0,
        attemptsCompleted: gradedAttemptStats?.attemptsCompleted ?? 0,
        latestScorePercent: gradedAttemptStats?.latestScorePercent ?? null,
      });
    }

    return summaries;
  }

  private async countExamAssignmentsByClassIds(
    rawClassIds: readonly string[],
  ): Promise<Map<string, number>> {
    const uniqueClassIds = [
      ...new Set(rawClassIds.filter(isUuidV4).map((classId) => normalizeUuid(classId))),
    ];

    if (uniqueClassIds.length === 0) {
      return new Map();
    }

    const countRows = await this.examAssignmentRepository
      .createQueryBuilder('assignment')
      .select('assignment.classId', 'classId')
      .addSelect('COUNT(*)', 'count')
      .where('assignment.classId IN (:...classIds)', { classIds: uniqueClassIds })
      .andWhere('assignment.status IN (:...statuses)', {
        statuses: [
          ExamAssignmentStatus.Scheduled,
          ExamAssignmentStatus.Open,
          ExamAssignmentStatus.Closed,
        ],
      })
      .groupBy('assignment.classId')
      .getRawMany<{ classId: string; count: string }>();

    return new Map(countRows.map((row) => [normalizeUuid(row.classId), Number(row.count ?? 0)]));
  }

  private async getGradedAttemptStatsByEnrollmentIds(
    rawEnrollmentIds: readonly string[],
  ): Promise<Map<string, { attemptsCompleted: number; latestScorePercent: string | null }>> {
    const uniqueEnrollmentIds = [
      ...new Set(
        rawEnrollmentIds.filter(isUuidV4).map((enrollmentId) => normalizeUuid(enrollmentId)),
      ),
    ];

    if (uniqueEnrollmentIds.length === 0) {
      return new Map();
    }

    const gradedAttempts = await this.examAttemptRepository.find({
      where: {
        enrollmentId: In(uniqueEnrollmentIds),
        status: ExamAttemptStatus.Graded,
      },
      order: { gradedAt: 'DESC' },
    });
    const statsByEnrollmentId = new Map<
      string,
      { attemptsCompleted: number; latestScorePercent: string | null }
    >();

    for (const attempt of gradedAttempts) {
      const enrollmentId = normalizeUuid(attempt.enrollmentId);
      const existingStats = statsByEnrollmentId.get(enrollmentId);

      if (existingStats === undefined) {
        statsByEnrollmentId.set(enrollmentId, {
          attemptsCompleted: 1,
          latestScorePercent: attempt.scorePercent ?? null,
        });
        continue;
      }

      existingStats.attemptsCompleted += 1;
    }

    return statsByEnrollmentId;
  }

  async createExam(rawParishId: string, input: CreateExamInput): Promise<ExamSnapshot> {
    const parishSnapshot = await this.parishService.assertParishActive(rawParishId);

    const exam = this.examRepository.create({
      parishId: parishSnapshot.id,
      code: parseExamCode(input.code),
      status: ExamStatus.Active,
      currentPublishedVersionId: null,
    });

    try {
      const savedExam = await this.examRepository.save(exam);

      return toExamSnapshot(savedExam);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new ExamCodeAlreadyExistsError(exam.code);
      }

      throw error;
    }
  }

  async getExamById(rawExamId: string): Promise<ExamSnapshot> {
    const exam = await this.findExamEntity(rawExamId);

    return toExamSnapshot(exam);
  }

  async getExamParishId(rawExamId: string): Promise<string> {
    const exam = await this.findExamEntity(rawExamId);

    return normalizeUuid(exam.parishId);
  }

  async getVersionExamParishId(rawVersionId: string): Promise<string> {
    const version = await this.findVersionEntity(rawVersionId);
    const exam = await this.findExamEntity(version.examId);

    return normalizeUuid(exam.parishId);
  }

  async listExamsByParish(rawParishId: string, input: ListExamsInput): Promise<ListExamsResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);

    const queryBuilder = this.examRepository
      .createQueryBuilder('exam')
      .where('exam.parishId = :parishId', { parishId: parishSnapshot.id });

    if (input.status !== undefined) {
      queryBuilder.andWhere('exam.status = :status', { status: input.status });
    }

    if (input.search !== undefined && input.search.trim().length > 0) {
      const escapedSearch = escapeLikePattern(input.search.trim().toLowerCase());
      queryBuilder.andWhere("LOWER(exam.code) LIKE :search ESCAPE '\\'", {
        search: `%${escapedSearch}%`,
      });
    }

    const total = await queryBuilder.getCount();
    const sortColumn =
      input.sortBy === 'code'
        ? 'exam.code'
        : input.sortBy === 'createdAt'
          ? 'exam.createdAt'
          : 'exam.updatedAt';

    const entities = await queryBuilder
      .orderBy(sortColumn, input.sort)
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .getMany();

    return {
      items: entities.map(toExamSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async updateExam(rawExamId: string, input: UpdateExamInput): Promise<ExamSnapshot> {
    if (input.code === undefined) {
      throw new ExamUpdateRequiresFieldsError();
    }

    const exam = await this.findExamEntity(rawExamId);
    this.assertExamActive(exam);
    exam.code = parseExamCode(input.code);

    try {
      const savedExam = await this.examRepository.save(exam);

      return toExamSnapshot(savedExam);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new ExamCodeAlreadyExistsError(exam.code);
      }

      throw error;
    }
  }

  async updateExamStatus(rawExamId: string, status: ExamStatus): Promise<ExamSnapshot> {
    const exam = await this.findExamEntity(rawExamId);
    exam.status = status;

    const savedExam = await this.examRepository.save(exam);

    return toExamSnapshot(savedExam);
  }

  async createExamVersion(
    rawExamId: string,
    input: CreateExamVersionInput,
  ): Promise<ExamVersionSnapshot> {
    const examId = this.parseExamId(rawExamId);
    const exam = await this.findExamEntity(examId);
    this.assertExamActive(exam);

    const existingDraft = await this.examVersionRepository.findOne({
      where: {
        examId: exam.id,
        status: ExamVersionStatus.Draft,
      },
    });

    if (existingDraft !== null) {
      throw new ExamDraftAlreadyExistsError();
    }

    const maxVersionNumber = await this.examVersionRepository
      .createQueryBuilder('version')
      .select('MAX(version.versionNumber)', 'maxVersionNumber')
      .where('version.examId = :examId', { examId: exam.id })
      .getRawOne<{ maxVersionNumber: number | null }>();

    const nextVersionNumber = (maxVersionNumber?.maxVersionNumber ?? 0) + 1;
    const reviewPolicy = input.reviewPolicy ?? DEFAULT_EXAM_REVIEW_POLICY;

    const version = this.examVersionRepository.create({
      examId: exam.id,
      versionNumber: nextVersionNumber,
      title: parseExamTitle(input.title),
      description: parseExamDescription(input.description),
      instructions: parseExamInstructions(input.instructions),
      sourceLocale: parseExamSourceLocale(input.sourceLocale),
      durationMinutes: this.parseDurationMinutes(input.durationMinutes),
      maxAttempts: this.parseMaxAttempts(input.maxAttempts),
      passingScorePercent: this.parsePassingScorePercent(input.passingScorePercent),
      shuffleQuestions: input.shuffleQuestions,
      shuffleOptions: input.shuffleOptions,
      reviewPolicyJson: serializeExamReviewPolicy(parseExamReviewPolicy(reviewPolicy)),
      status: ExamVersionStatus.Draft,
      publishedAt: null,
      publishedByUserId: null,
    });

    try {
      const savedVersion = await this.examVersionRepository.save(version);

      return toExamVersionSnapshot(savedVersion);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new ExamVersionNumberConflictError();
      }

      throw error;
    }
  }

  async listVersionsByExam(
    rawExamId: string,
    input: ListExamVersionsInput,
  ): Promise<ExamVersionSnapshot[]> {
    const examId = this.parseExamId(rawExamId);
    await this.findExamEntity(examId);

    const queryBuilder = this.examVersionRepository
      .createQueryBuilder('version')
      .where('version.examId = :examId', { examId });

    if (input.status !== undefined) {
      queryBuilder.andWhere('version.status = :status', { status: input.status });
    }

    const versions = await queryBuilder
      .orderBy('version.versionNumber', 'DESC')
      .addOrderBy('version.createdAt', 'DESC')
      .getMany();

    return versions.map(toExamVersionSnapshot);
  }

  async getVersionById(rawVersionId: string): Promise<ExamVersionSnapshot> {
    const version = await this.findVersionEntity(rawVersionId);

    return toExamVersionSnapshot(version);
  }

  async assertVersionBelongsToExam(rawVersionId: string, rawExamId: string): Promise<void> {
    const version = await this.findVersionEntity(rawVersionId);
    const examId = this.parseExamId(rawExamId);

    if (normalizeUuid(version.examId) !== examId) {
      throw new ExamVersionExamMismatchError();
    }
  }

  async updateDraftVersion(
    rawVersionId: string,
    input: UpdateExamVersionInput,
  ): Promise<ExamVersionSnapshot> {
    if (
      input.title === undefined &&
      input.description === undefined &&
      input.instructions === undefined &&
      input.sourceLocale === undefined &&
      input.durationMinutes === undefined &&
      input.maxAttempts === undefined &&
      input.passingScorePercent === undefined &&
      input.shuffleQuestions === undefined &&
      input.shuffleOptions === undefined &&
      input.reviewPolicy === undefined
    ) {
      throw new ExamVersionUpdateRequiresFieldsError();
    }

    const version = await this.findVersionEntity(rawVersionId);

    if (version.status !== ExamVersionStatus.Draft) {
      throw new ExamVersionNotDraftError();
    }

    const exam = await this.findExamEntity(version.examId);
    this.assertExamActive(exam);

    if (input.title !== undefined) {
      version.title = parseExamTitle(input.title);
    }

    if (input.description !== undefined) {
      version.description = parseExamDescription(input.description);
    }

    if (input.instructions !== undefined) {
      version.instructions = parseExamInstructions(input.instructions);
    }

    if (input.sourceLocale !== undefined) {
      await this.assertSourceLocaleMutable(version.examId);
      version.sourceLocale = parseExamSourceLocale(input.sourceLocale);
    }

    if (input.durationMinutes !== undefined) {
      version.durationMinutes = this.parseDurationMinutes(input.durationMinutes);
    }

    if (input.maxAttempts !== undefined) {
      version.maxAttempts = this.parseMaxAttempts(input.maxAttempts);
    }

    if (input.passingScorePercent !== undefined) {
      version.passingScorePercent = this.parsePassingScorePercent(input.passingScorePercent);
    }

    if (input.shuffleQuestions !== undefined) {
      version.shuffleQuestions = input.shuffleQuestions;
    }

    if (input.shuffleOptions !== undefined) {
      version.shuffleOptions = input.shuffleOptions;
    }

    if (input.reviewPolicy !== undefined) {
      version.reviewPolicyJson = serializeExamReviewPolicy(
        parseExamReviewPolicy(input.reviewPolicy),
      );
    }

    const savedVersion = await this.examVersionRepository.save(version);

    return toExamVersionSnapshot(savedVersion);
  }

  async listVersionQuestions(rawVersionId: string): Promise<ExamVersionQuestionSnapshot[]> {
    const versionId = this.parseVersionId(rawVersionId);
    await this.findVersionEntity(versionId);

    const questions = await this.examVersionQuestionRepository.find({
      where: { examVersionId: versionId },
      order: { sortOrder: 'ASC' },
    });

    return questions.map(toExamVersionQuestionSnapshot);
  }

  async replaceVersionQuestions(
    rawVersionId: string,
    input: ReplaceExamVersionQuestionsInput,
  ): Promise<ExamVersionQuestionSnapshot[]> {
    const version = await this.findVersionEntity(rawVersionId);

    if (version.status !== ExamVersionStatus.Draft) {
      throw new ExamVersionNotDraftError();
    }

    const exam = await this.findExamEntity(version.examId);
    this.assertExamActive(exam);

    const uniqueQuestionIds = [...new Set(input.questionIds.map((id) => normalizeUuid(id)))];

    if (uniqueQuestionIds.length !== input.questionIds.length) {
      throw new InvalidExamVersionQuestionsError();
    }

    for (const questionId of uniqueQuestionIds) {
      const question = await this.questionBankService.getQuestionById(questionId);

      if (normalizeUuid(question.parishId) !== normalizeUuid(exam.parishId)) {
        throw new ExamQuestionParishMismatchError();
      }
    }

    await this.examVersionQuestionRepository.delete({ examVersionId: version.id });

    const rows = uniqueQuestionIds.map((questionId, index) =>
      this.examVersionQuestionRepository.create({
        examVersionId: version.id,
        questionId,
        questionVersionId: null,
        sortOrder: index + 1,
      }),
    );

    const savedRows = await this.examVersionQuestionRepository.save(rows);

    return savedRows
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(toExamVersionQuestionSnapshot);
  }

  async collectPublishValidationIssues(
    rawVersionId: string,
  ): Promise<ExamPublishValidationIssue[]> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await this.findVersionEntity(versionId);
    const issues: ExamPublishValidationIssue[] = [];

    const questions = await this.examVersionQuestionRepository.find({
      where: { examVersionId: version.id },
      order: { sortOrder: 'ASC' },
    });

    if (questions.length === 0) {
      issues.push({
        code: 'NO_QUESTIONS',
        message: 'Exam version must contain at least one question.',
      });
    }

    for (const questionRow of questions) {
      const question = await this.questionBankService.getQuestionById(questionRow.questionId);

      if (question.status !== QuestionStatus.Active) {
        issues.push({
          code: 'QUESTION_INACTIVE',
          message: 'Exam version references an inactive question.',
          resourceId: question.id,
          path: `questions/${question.id}`,
        });
      }

      if (question.currentPublishedVersionId === null) {
        issues.push({
          code: 'QUESTION_NOT_PUBLISHED',
          message: 'Exam version references a question without a published version.',
          resourceId: question.id,
          path: `questions/${question.id}`,
        });
      }
    }

    if (version.durationMinutes < 1) {
      issues.push({
        code: 'INVALID_DURATION',
        message: 'Exam duration must be at least one minute.',
      });
    }

    if (version.maxAttempts < 1) {
      issues.push({
        code: 'INVALID_MAX_ATTEMPTS',
        message: 'Exam max attempts must be at least one.',
      });
    }

    return issues;
  }

  async publishDraftVersionTransaction(
    rawVersionId: string,
    publishedByUserId: string,
    entityManager: EntityManager,
  ): Promise<ExamVersionSnapshot> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await entityManager.findOne(ExamVersionEntity, {
      where: { id: versionId },
    });

    if (version === null) {
      throw new ExamVersionNotFoundError();
    }

    if (version.status !== ExamVersionStatus.Draft) {
      throw new ExamVersionNotDraftError();
    }

    const exam = await entityManager.findOne(ExamEntity, {
      where: { id: version.examId },
      lock: { mode: 'pessimistic_write' },
    });

    if (exam === null) {
      throw new ExamNotFoundError();
    }

    this.assertExamActive(exam);

    const questionRows = await entityManager.find(ExamVersionQuestionEntity, {
      where: { examVersionId: version.id },
      order: { sortOrder: 'ASC' },
    });

    for (const questionRow of questionRows) {
      const question = await this.questionBankService.getQuestionById(questionRow.questionId);
      questionRow.questionVersionId = question.currentPublishedVersionId;
      await entityManager.save(ExamVersionQuestionEntity, questionRow);
    }

    if (exam.currentPublishedVersionId !== null) {
      const previousPublishedVersion = await entityManager.findOne(ExamVersionEntity, {
        where: { id: exam.currentPublishedVersionId },
      });

      if (previousPublishedVersion !== null) {
        previousPublishedVersion.status = ExamVersionStatus.Archived;
        await entityManager.save(ExamVersionEntity, previousPublishedVersion);
      }
    }

    const publishedAt = new Date();
    version.status = ExamVersionStatus.Published;
    version.publishedAt = publishedAt;
    version.publishedByUserId = normalizeUuid(publishedByUserId);
    exam.currentPublishedVersionId = version.id;

    await entityManager.save(ExamVersionEntity, version);
    await entityManager.save(ExamEntity, exam);

    return toExamVersionSnapshot(version);
  }

  async cloneVersionStructureTransaction(
    rawSourceVersionId: string,
    entityManager: EntityManager,
  ): Promise<ExamVersionSnapshot> {
    const sourceVersionId = this.parseVersionId(rawSourceVersionId);
    const sourceVersion = await entityManager.findOne(ExamVersionEntity, {
      where: { id: sourceVersionId },
    });

    if (sourceVersion === null) {
      throw new ExamVersionNotFoundError();
    }

    if (
      sourceVersion.status !== ExamVersionStatus.Published &&
      sourceVersion.status !== ExamVersionStatus.Archived
    ) {
      throw new ExamVersionNotCloneableError();
    }

    const exam = await entityManager.findOne(ExamEntity, {
      where: { id: sourceVersion.examId },
      lock: { mode: 'pessimistic_write' },
    });

    if (exam === null) {
      throw new ExamNotFoundError();
    }

    this.assertExamActive(exam);

    const existingDraft = await entityManager.findOne(ExamVersionEntity, {
      where: {
        examId: exam.id,
        status: ExamVersionStatus.Draft,
      },
    });

    if (existingDraft !== null) {
      throw new ExamDraftAlreadyExistsError();
    }

    const maxVersionNumber = await entityManager
      .createQueryBuilder(ExamVersionEntity, 'version')
      .select('MAX(version.versionNumber)', 'maxVersionNumber')
      .where('version.examId = :examId', { examId: exam.id })
      .getRawOne<{ maxVersionNumber: number | null }>();

    const nextVersionNumber = (maxVersionNumber?.maxVersionNumber ?? 0) + 1;

    const draftVersion = entityManager.create(ExamVersionEntity, {
      examId: exam.id,
      versionNumber: nextVersionNumber,
      title: sourceVersion.title,
      description: sourceVersion.description,
      instructions: sourceVersion.instructions,
      sourceLocale: sourceVersion.sourceLocale,
      durationMinutes: sourceVersion.durationMinutes,
      maxAttempts: sourceVersion.maxAttempts,
      passingScorePercent: sourceVersion.passingScorePercent,
      shuffleQuestions: sourceVersion.shuffleQuestions,
      shuffleOptions: sourceVersion.shuffleOptions,
      reviewPolicyJson: sourceVersion.reviewPolicyJson,
      status: ExamVersionStatus.Draft,
      publishedAt: null,
      publishedByUserId: null,
    });

    const savedDraftVersion = await entityManager.save(ExamVersionEntity, draftVersion);

    const sourceQuestions = await entityManager.find(ExamVersionQuestionEntity, {
      where: { examVersionId: sourceVersion.id },
      order: { sortOrder: 'ASC' },
    });

    if (sourceQuestions.length > 0) {
      const clonedQuestions = sourceQuestions.map((sourceQuestion) =>
        entityManager.create(ExamVersionQuestionEntity, {
          examVersionId: savedDraftVersion.id,
          questionId: sourceQuestion.questionId,
          questionVersionId: null,
          sortOrder: sourceQuestion.sortOrder,
        }),
      );

      await entityManager.save(ExamVersionQuestionEntity, clonedQuestions);
    }

    return toExamVersionSnapshot(savedDraftVersion);
  }

  private parseExamId(rawExamId: string): string {
    if (!isUuidV4(rawExamId)) {
      throw new InvalidExamIdError();
    }

    return normalizeUuid(rawExamId);
  }

  private parseVersionId(rawVersionId: string): string {
    if (!isUuidV4(rawVersionId)) {
      throw new InvalidExamVersionIdError();
    }

    return normalizeUuid(rawVersionId);
  }

  private async findExamEntity(rawExamId: string): Promise<ExamEntity> {
    const examId = this.parseExamId(rawExamId);
    const exam = await this.examRepository.findOne({ where: { id: examId } });

    if (exam === null) {
      throw new ExamNotFoundError();
    }

    return exam;
  }

  private async findVersionEntity(rawVersionId: string): Promise<ExamVersionEntity> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await this.examVersionRepository.findOne({ where: { id: versionId } });

    if (version === null) {
      throw new ExamVersionNotFoundError();
    }

    return version;
  }

  private assertExamActive(exam: ExamEntity): void {
    if (exam.status !== ExamStatus.Active) {
      throw new ExamInactiveError();
    }
  }

  private parseDurationMinutes(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 600) {
      throw new InvalidExamDurationError();
    }

    return value;
  }

  private parseMaxAttempts(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      throw new InvalidExamMaxAttemptsError();
    }

    return value;
  }

  private parsePassingScorePercent(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) {
      throw new InvalidExamPassingScoreError();
    }

    const numericValue = Number(trimmed);

    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
      throw new InvalidExamPassingScoreError();
    }

    return trimmed;
  }

  private async assertSourceLocaleMutable(examId: string): Promise<void> {
    const publishedOrArchivedCount = await this.examVersionRepository.count({
      where: [
        { examId, status: ExamVersionStatus.Published },
        { examId, status: ExamVersionStatus.Archived },
      ],
    });

    if (publishedOrArchivedCount > 0) {
      throw new ExamSourceLocaleImmutableError();
    }
  }
}
