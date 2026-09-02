import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { generateUuidV4, isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { ClassService } from '../../class/services/class.service';
import { ClassStatus } from '../../class/enums/class-status.enum';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { TranslationResourceType } from '../../localization/enums/translation-resource-type.enum';
import { LocaleResolutionService } from '../../localization/services/locale-resolution.service';
import { LocalizationService } from '../../localization/services/localization.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import type { LearnerQuestionProjection } from '../../question-bank/interfaces/question-bank.interface';
import { StudentService } from '../../student/services/student.service';
import { StudentStatus } from '../../student/enums/student-status.enum';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamAttemptQuestionEntity } from '../entities/exam-attempt-question.entity';
import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import {
  ExamAssignmentNotFoundError,
  ExamAssignmentNotOpenError,
  ExamAttemptLimitReachedError,
  ExamAttemptQuestionsNotReadyError,
  ExamEnrollmentNotEligibleError,
  ExamIdempotencyConflictError,
  ExamInactiveError,
} from '../errors/exam.errors';
import type {
  ExamAttemptDeliverySnapshot,
  StartExamAttemptInput,
} from '../interfaces/exam-attempt.interface';
import { parseExamSourceLocale } from '../utils/exam-source-locale.util';
import { resolveExamAssignmentEffectiveStatus } from '../utils/exam-assignment-status.util';
import { computeExamAttemptDeadlineAt } from '../utils/exam-deadline.util';
import {
  DefaultShuffleRandomSource,
  shuffleCopy,
  type ShuffleRandomSource,
} from '../utils/exam-shuffle.util';
import { ExamAttemptAccessService } from './exam-attempt-access.service';
import { ExamAttemptQueryService } from './exam-attempt-query.service';
import { ExamService } from './exam.service';

@Injectable()
export class ExamAttemptGenerationService {
  private readonly shuffleRandomSource: ShuffleRandomSource = new DefaultShuffleRandomSource();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ExamAssignmentEntity)
    private readonly examAssignmentRepository: Repository<ExamAssignmentEntity>,
    @InjectRepository(ExamAttemptEntity)
    private readonly examAttemptRepository: Repository<ExamAttemptEntity>,
    private readonly examService: ExamService,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentService: StudentService,
    private readonly classService: ClassService,
    private readonly questionBankService: QuestionBankService,
    private readonly localizationService: LocalizationService,
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly examAttemptAccessService: ExamAttemptAccessService,
    private readonly examAttemptQueryService: ExamAttemptQueryService,
  ) {}

  async startAttempt(input: StartExamAttemptInput): Promise<ExamAttemptDeliverySnapshot> {
    const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);
    await this.examAttemptAccessService.assertCanAttemptAsLinkedStudent(
      input.actorUserId,
      enrollment.studentId,
    );
    await this.assertEnrollmentEligible(
      enrollment.status,
      enrollment.studentId,
      enrollment.classId,
    );

    const assignment = await this.examAssignmentRepository.findOne({
      where: { id: normalizeUuid(input.examAssignmentId) },
    });

    if (
      assignment === null ||
      normalizeUuid(assignment.classId) !== normalizeUuid(enrollment.classId)
    ) {
      throw new ExamAssignmentNotFoundError();
    }

    const now = new Date();
    const effectiveStatus = resolveExamAssignmentEffectiveStatus(
      assignment.status,
      assignment.opensAt,
      assignment.closesAt,
      now,
    );

    if (effectiveStatus !== ExamAssignmentStatus.Open) {
      throw new ExamAssignmentNotOpenError();
    }

    if (input.clientRequestId !== undefined) {
      const existingByRequestId = await this.findAttemptByClientRequestId(
        enrollment.id,
        assignment.id,
        input.clientRequestId,
      );

      if (existingByRequestId !== null) {
        return this.examAttemptQueryService.getAttemptDelivery(
          existingByRequestId.id,
          input.actorUserId,
        );
      }
    }

    const inProgressAttempt = await this.examAttemptRepository.findOne({
      where: {
        enrollmentId: enrollment.id,
        examAssignmentId: assignment.id,
        status: ExamAttemptStatus.InProgress,
      },
    });

    if (inProgressAttempt !== null) {
      return this.examAttemptQueryService.getAttemptDelivery(
        inProgressAttempt.id,
        input.actorUserId,
      );
    }

    const version = await this.examService.getVersionById(assignment.examVersionId);
    const exam = await this.examService.getExamById(version.examId);

    if (exam.status !== ExamStatus.Active) {
      throw new ExamInactiveError();
    }

    const startedAttemptsCount = await this.examAttemptRepository.count({
      where: {
        enrollmentId: enrollment.id,
        examAssignmentId: assignment.id,
        status: In([
          ExamAttemptStatus.InProgress,
          ExamAttemptStatus.Submitted,
          ExamAttemptStatus.Graded,
        ]),
      },
    });

    if (startedAttemptsCount >= version.maxAttempts) {
      throw new ExamAttemptLimitReachedError();
    }

    const versionQuestions = await this.examService.listVersionQuestions(version.id);

    if (versionQuestions.length === 0) {
      throw new ExamAttemptQuestionsNotReadyError();
    }

    for (const questionRow of versionQuestions) {
      if (questionRow.questionVersionId === null) {
        throw new ExamAttemptQuestionsNotReadyError();
      }
    }

    const classSnapshot = await this.classService.getClassById(enrollment.classId);
    const resolvedLocale = this.resolveDeliveredLocale(input);
    const orderedQuestions = version.shuffleQuestions
      ? shuffleCopy(versionQuestions, this.shuffleRandomSource)
      : [...versionQuestions];

    const questionVersionIds = orderedQuestions.map((row) => normalizeUuid(row.questionVersionId!));
    const projections =
      await this.questionBankService.getLearnerQuestionProjections(questionVersionIds);
    const projectionMap = new Map(
      projections.map((projection) => [normalizeUuid(projection.questionVersionId), projection]),
    );
    const assessmentSnapshots = await Promise.all(
      questionVersionIds.map((questionVersionId) =>
        this.questionBankService.getImmutableAssessmentSnapshot(questionVersionId),
      ),
    );
    const assessmentByVersionId = new Map(
      assessmentSnapshots.map((snapshot) => [normalizeUuid(snapshot.questionVersionId), snapshot]),
    );

    const localizedResolutions = await this.localizationService.resolveLocalizedResources(
      questionVersionIds.map((questionVersionId) => ({
        resourceType: TranslationResourceType.QuestionBankVersion,
        resourceId: questionVersionId,
        targetLocale: resolvedLocale,
        requestedLocale: resolvedLocale,
        parishId: classSnapshot.parishId,
      })),
    );
    const localizationByVersionId = new Map(
      questionVersionIds.map((questionVersionId, index) => [
        questionVersionId,
        localizedResolutions[index],
      ]),
    );

    const startedAt = now;
    const deadlineAt = computeExamAttemptDeadlineAt(
      startedAt,
      version.durationMinutes,
      assignment.closesAt,
    );
    const attemptId = generateUuidV4();
    const attemptNumber = startedAttemptsCount + 1;

    try {
      await this.dataSource.transaction(async (entityManager) => {
        const attemptRepository = entityManager.getRepository(ExamAttemptEntity);
        const attemptQuestionRepository = entityManager.getRepository(ExamAttemptQuestionEntity);

        const attempt = attemptRepository.create({
          id: attemptId,
          examAssignmentId: assignment.id,
          enrollmentId: enrollment.id,
          attemptNumber,
          startedByUserId: normalizeUuid(input.actorUserId),
          clientRequestId:
            input.clientRequestId === undefined ? null : normalizeUuid(input.clientRequestId),
          status: ExamAttemptStatus.InProgress,
          autoSubmitReason: null,
          examId: exam.id,
          examVersionId: version.id,
          studentId: enrollment.studentId,
          classId: enrollment.classId,
          parishId: classSnapshot.parishId,
          academicYearId: classSnapshot.academicYearId,
          catechismLevelId: classSnapshot.catechismLevelId,
          examTitleDelivered: version.title,
          instructionsDelivered: version.instructions,
          examTranslationRevisionId: null,
          deliveredLocale: resolvedLocale,
          startedAt,
          deadlineAt,
          submittedAt: null,
          gradedAt: null,
          questionCount: orderedQuestions.length,
          correctCount: null,
          scorePercent: null,
          passed: null,
        });

        await attemptRepository.save(attempt);

        for (const [index, questionRow] of orderedQuestions.entries()) {
          const questionVersionId = normalizeUuid(questionRow.questionVersionId!);
          const projection = projectionMap.get(questionVersionId);

          if (projection === undefined) {
            throw new ExamAttemptQuestionsNotReadyError();
          }

          const assessment = assessmentByVersionId.get(questionVersionId);

          if (
            assessment === null ||
            assessment === undefined ||
            assessment.sourceContentHash === null
          ) {
            throw new ExamAttemptQuestionsNotReadyError();
          }

          const localization = localizationByVersionId.get(questionVersionId);

          const attemptQuestion = attemptQuestionRepository.create({
            examAttemptId: attempt.id,
            questionId: questionRow.questionId,
            questionVersionId,
            sortOrder: index + 1,
            deliveredOptionOrderJson: this.buildDeliveredOptionOrderJson(
              projection,
              version.shuffleOptions,
            ),
            translationRevisionId: localization?.translationRevisionId ?? null,
            deliveredLocale:
              localization === undefined
                ? assessment.sourceLocale
                : localization.isFallback
                  ? localization.sourceLocale
                  : localization.resolvedLocale,
            sourceContentHash: assessment.sourceContentHash,
          });

          await attemptQuestionRepository.save(attemptQuestion);
        }
      });
    } catch (error: unknown) {
      if (
        input.clientRequestId !== undefined &&
        error instanceof QueryFailedError &&
        isUniqueConstraintViolation(error)
      ) {
        const existingByRequestId = await this.findAttemptByClientRequestId(
          enrollment.id,
          assignment.id,
          input.clientRequestId,
        );

        if (existingByRequestId !== null) {
          return this.examAttemptQueryService.getAttemptDelivery(
            existingByRequestId.id,
            input.actorUserId,
          );
        }

        const resumedAttempt = await this.examAttemptRepository.findOne({
          where: {
            enrollmentId: enrollment.id,
            examAssignmentId: assignment.id,
            status: ExamAttemptStatus.InProgress,
          },
        });

        if (resumedAttempt !== null) {
          return this.examAttemptQueryService.getAttemptDelivery(
            resumedAttempt.id,
            input.actorUserId,
          );
        }

        throw new ExamIdempotencyConflictError();
      }

      throw error;
    }

    return this.examAttemptQueryService.getAttemptDelivery(attemptId, input.actorUserId);
  }

  private async findAttemptByClientRequestId(
    enrollmentId: string,
    examAssignmentId: string,
    rawClientRequestId: string,
  ): Promise<ExamAttemptEntity | null> {
    if (!isUuidV4(rawClientRequestId)) {
      throw new ExamIdempotencyConflictError();
    }

    return this.examAttemptRepository.findOne({
      where: {
        enrollmentId: normalizeUuid(enrollmentId),
        examAssignmentId: normalizeUuid(examAssignmentId),
        clientRequestId: normalizeUuid(rawClientRequestId),
      },
    });
  }

  private resolveDeliveredLocale(input: StartExamAttemptInput): string {
    if (input.locale !== undefined) {
      return parseExamSourceLocale(input.locale);
    }

    const resolution = this.localeResolutionService.resolveLocale({
      acceptLanguageHeader: input.acceptLanguageHeader ?? null,
    });

    return resolution.resolvedLocale;
  }

  private buildDeliveredOptionOrderJson(
    projection: LearnerQuestionProjection,
    shuffleOptions: boolean,
  ): string | null {
    if (!shuffleOptions) {
      return null;
    }

    const optionIds = projection.options.map((option) => normalizeUuid(option.id));

    return JSON.stringify(shuffleCopy(optionIds, this.shuffleRandomSource));
  }

  private async assertEnrollmentEligible(
    enrollmentStatus: EnrollmentStatus,
    studentId: string,
    classId: string,
  ): Promise<void> {
    if (enrollmentStatus !== EnrollmentStatus.Active) {
      throw new ExamEnrollmentNotEligibleError();
    }

    const student = await this.studentService.getStudentById(studentId);

    if (student.status !== StudentStatus.Active) {
      throw new ExamEnrollmentNotEligibleError();
    }

    const classSnapshot = await this.classService.getClassById(classId);

    if (classSnapshot.status !== ClassStatus.Active) {
      throw new ExamEnrollmentNotEligibleError();
    }
  }
}
