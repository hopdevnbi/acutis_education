import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { generateUuidV4, isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { ClassService } from '../../class/services/class.service';
import { ClassStatus } from '../../class/enums/class-status.enum';
import { CurriculumAssignmentNotFoundError } from '../../curriculum/errors/curriculum.errors';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { parseSourceLocale } from '../../curriculum/utils/curriculum-source-locale.util';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import type { PublishedQuestionSelectionSnapshot } from '../../question-bank/interfaces/question-bank.interface';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { TranslationResourceType } from '../../localization/enums/translation-resource-type.enum';
import { LocalizationService } from '../../localization/services/localization.service';
import { StudentStatus } from '../../student/enums/student-status.enum';
import { StudentService } from '../../student/services/student.service';
import {
  PRACTICE_DEFAULT_LOCALE,
  PRACTICE_DEFAULT_MAX_ATTEMPTS_PER_QUESTION,
  PRACTICE_DEFAULT_QUESTION_COUNT,
  PRACTICE_MAX_QUESTION_COUNT,
  PRACTICE_MAX_TAG_FILTER_COUNT,
  PRACTICE_MIN_QUESTION_COUNT,
} from '../constants/practice-session.constants';
import { PracticeSessionQuestionEntity } from '../entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionType } from '../enums/practice-session-type.enum';
import {
  PracticeCanonicalLessonInvalidError,
  PracticeCurriculumMismatchError,
  PracticeCurriculumNotAssignedError,
  PracticeIdempotencyConflictError,
  PracticeInsufficientQuestionsError,
  PracticeInvalidGenerationInputError,
  PracticeEnrollmentNotEligibleError,
} from '../errors/practice.errors';
import type {
  CreatePracticeSessionInput,
  NormalizedPracticeGenerationRequest,
  PracticeSessionSnapshot,
} from '../interfaces/practice.interface';
import { computePracticeGenerationRequestHash } from '../utils/practice-generation-request-hash.util';
import {
  DefaultShuffleRandomSource,
  shuffleCopy,
  type ShuffleRandomSource,
} from '../utils/practice-shuffle.util';
import { PracticeAccessService } from './practice-access.service';
import { PracticeSessionQueryService } from './practice-session-query.service';

@Injectable()
export class PracticeGenerationService {
  private readonly shuffleRandomSource: ShuffleRandomSource = new DefaultShuffleRandomSource();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentService: StudentService,
    private readonly classService: ClassService,
    private readonly curriculumService: CurriculumService,
    private readonly questionBankService: QuestionBankService,
    private readonly localizationService: LocalizationService,
    private readonly practiceAccessService: PracticeAccessService,
    private readonly practiceSessionQueryService: PracticeSessionQueryService,
  ) {}

  async createSession(input: CreatePracticeSessionInput): Promise<PracticeSessionSnapshot> {
    const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);

    await this.practiceAccessService.assertCanManageEnrollmentPractice(
      input.actorUserId,
      enrollment.studentId,
    );
    await this.assertEnrollmentEligible(
      enrollment.status,
      enrollment.studentId,
      enrollment.classId,
    );

    const classSnapshot = await this.classService.getClassById(enrollment.classId);
    const normalizedRequest = this.normalizeGenerationRequest(input);

    let assignedCurriculumId: string;

    try {
      const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
        classSnapshot.parishId,
        classSnapshot.academicYearId,
        classSnapshot.catechismLevelId,
      );
      assignedCurriculumId = assignedVersion.curriculumId;
    } catch (error: unknown) {
      if (error instanceof CurriculumAssignmentNotFoundError) {
        throw new PracticeCurriculumNotAssignedError();
      }

      throw error;
    }

    const effectiveCurriculumId = normalizedRequest.curriculumId ?? assignedCurriculumId;

    if (
      normalizedRequest.curriculumId !== null &&
      normalizedRequest.curriculumId !== assignedCurriculumId
    ) {
      throw new PracticeCurriculumMismatchError();
    }

    const generationRequestHash = computePracticeGenerationRequestHash(
      normalizedRequest,
      effectiveCurriculumId,
    );

    if (input.clientRequestId !== undefined) {
      const existingSession =
        await this.practiceSessionQueryService.findExistingSessionByClientRequestId(
          enrollment.id,
          input.clientRequestId,
        );

      if (existingSession !== null) {
        if (
          existingSession.generationRequestHash !== null &&
          existingSession.generationRequestHash !== generationRequestHash
        ) {
          throw new PracticeIdempotencyConflictError();
        }

        return this.practiceSessionQueryService.getSessionSnapshot(existingSession.id);
      }
    }

    if (normalizedRequest.canonicalLessonKey !== null) {
      try {
        await this.curriculumService.assertCanonicalLessonKeyBelongsToCurriculum(
          effectiveCurriculumId,
          normalizedRequest.canonicalLessonKey,
        );
      } catch {
        throw new PracticeCanonicalLessonInvalidError();
      }
    }

    const candidates = await this.questionBankService.selectCurrentPublishedQuestionsForPractice({
      parishId: classSnapshot.parishId,
      questionCount: normalizedRequest.questionCount,
      curriculumId: effectiveCurriculumId,
      canonicalLessonKey: normalizedRequest.canonicalLessonKey ?? undefined,
      tagIds: normalizedRequest.tagIds.length > 0 ? normalizedRequest.tagIds : undefined,
      tagCodes: normalizedRequest.tagCodes.length > 0 ? normalizedRequest.tagCodes : undefined,
      questionTypes:
        normalizedRequest.questionTypes.length > 0 ? normalizedRequest.questionTypes : undefined,
      difficulty: normalizedRequest.difficulty ?? undefined,
    });

    if (candidates.length < normalizedRequest.questionCount) {
      throw new PracticeInsufficientQuestionsError(
        normalizedRequest.questionCount,
        candidates.length,
      );
    }

    const selectedCandidates = this.selectCandidates(candidates, normalizedRequest);
    const localizedResolutions = await this.localizationService.resolveLocalizedResources(
      selectedCandidates.map((candidate) => ({
        resourceType: TranslationResourceType.QuestionBankVersion,
        resourceId: candidate.questionVersionId,
        targetLocale: normalizedRequest.locale,
        requestedLocale: normalizedRequest.locale,
        parishId: classSnapshot.parishId,
      })),
    );
    const localizationByVersionId = new Map(
      selectedCandidates.map((candidate, index) => [
        normalizeUuid(candidate.questionVersionId),
        localizedResolutions[index],
      ]),
    );
    const projections = await this.questionBankService.getLearnerQuestionProjections(
      selectedCandidates.map((candidate) => candidate.questionVersionId),
    );
    const projectionMap = new Map(
      projections.map((projection) => [normalizeUuid(projection.questionVersionId), projection]),
    );

    const startedAt = new Date();
    const sessionId = generateUuidV4();

    try {
      await this.dataSource.transaction(async (entityManager) => {
        const sessionRepository = entityManager.getRepository(PracticeSessionEntity);
        const sessionQuestionRepository = entityManager.getRepository(
          PracticeSessionQuestionEntity,
        );

        const session = new PracticeSessionEntity();
        session.id = sessionId;
        session.enrollmentId = enrollment.id;
        session.sessionType = PracticeSessionType.Standard;
        session.sourceSessionId = null;
        session.status = PracticeSessionStatus.InProgress;
        session.locale = normalizedRequest.locale;
        session.curriculumId = effectiveCurriculumId;
        session.canonicalLessonKey = normalizedRequest.canonicalLessonKey;
        session.requestedQuestionCount = normalizedRequest.questionCount;
        session.maxAttemptsPerQuestion = PRACTICE_DEFAULT_MAX_ATTEMPTS_PER_QUESTION;
        session.randomizeQuestions = normalizedRequest.randomizeQuestions;
        session.randomizeOptions = normalizedRequest.randomizeOptions;
        session.clientRequestId =
          input.clientRequestId === undefined ? null : normalizeUuid(input.clientRequestId);
        session.generationRequestHash =
          input.clientRequestId === undefined ? null : generationRequestHash;
        session.createdByUserId = normalizeUuid(input.actorUserId);
        session.startedAt = startedAt;
        session.completedAt = null;
        session.abandonedAt = null;

        await sessionRepository.save(session);

        for (const [index, candidate] of selectedCandidates.entries()) {
          const projection = projectionMap.get(normalizeUuid(candidate.questionVersionId));

          if (projection === undefined) {
            throw new PracticeInsufficientQuestionsError(normalizedRequest.questionCount, 0);
          }

          const sessionQuestion = new PracticeSessionQuestionEntity();
          sessionQuestion.practiceSessionId = session.id;
          sessionQuestion.questionVersionId = candidate.questionVersionId;
          sessionQuestion.position = index + 1;
          sessionQuestion.deliveredOptionOrderJson = this.buildDeliveredOptionOrderJson(
            projection,
            normalizedRequest.randomizeOptions,
          );
          const localization = localizationByVersionId.get(
            normalizeUuid(candidate.questionVersionId),
          );
          sessionQuestion.translationRevisionId = localization?.translationRevisionId ?? null;
          sessionQuestion.deliveredLocale =
            localization === undefined
              ? candidate.sourceLocale
              : localization.isFallback
                ? localization.sourceLocale
                : localization.resolvedLocale;

          await sessionQuestionRepository.save(sessionQuestion);
        }
      });
    } catch (error: unknown) {
      if (
        input.clientRequestId !== undefined &&
        error instanceof QueryFailedError &&
        isUniqueConstraintViolation(error)
      ) {
        const existingSession =
          await this.practiceSessionQueryService.findExistingSessionByClientRequestId(
            enrollment.id,
            input.clientRequestId,
          );

        if (existingSession !== null) {
          if (
            existingSession.generationRequestHash !== null &&
            existingSession.generationRequestHash !== generationRequestHash
          ) {
            throw new PracticeIdempotencyConflictError();
          }

          return this.practiceSessionQueryService.getSessionSnapshot(existingSession.id);
        }
      }

      throw error;
    }

    return this.practiceSessionQueryService.getSessionSnapshot(sessionId);
  }

  private selectCandidates(
    candidates: readonly PublishedQuestionSelectionSnapshot[],
    request: NormalizedPracticeGenerationRequest,
  ): PublishedQuestionSelectionSnapshot[] {
    const orderedCandidates = request.randomizeQuestions
      ? shuffleCopy(candidates, this.shuffleRandomSource)
      : [...candidates];

    return orderedCandidates.slice(0, request.questionCount);
  }

  private buildDeliveredOptionOrderJson(
    projection: {
      readonly options: readonly { readonly id: string }[];
    },
    randomizeOptions: boolean,
  ): string | null {
    if (!randomizeOptions) {
      return null;
    }

    const optionIds = projection.options.map((option) => normalizeUuid(option.id));
    const shuffledOptionIds = shuffleCopy(optionIds, this.shuffleRandomSource);

    return JSON.stringify(shuffledOptionIds);
  }

  private normalizeGenerationRequest(
    input: CreatePracticeSessionInput,
  ): NormalizedPracticeGenerationRequest {
    const questionCount = input.questionCount ?? PRACTICE_DEFAULT_QUESTION_COUNT;

    if (
      !Number.isInteger(questionCount) ||
      questionCount < PRACTICE_MIN_QUESTION_COUNT ||
      questionCount > PRACTICE_MAX_QUESTION_COUNT
    ) {
      throw new PracticeInvalidGenerationInputError(
        `questionCount must be between ${PRACTICE_MIN_QUESTION_COUNT} and ${PRACTICE_MAX_QUESTION_COUNT}.`,
      );
    }

    const tagIds = input.tagIds ?? [];
    const tagCodes = input.tagCodes ?? [];

    if (
      tagIds.length > PRACTICE_MAX_TAG_FILTER_COUNT ||
      tagCodes.length > PRACTICE_MAX_TAG_FILTER_COUNT
    ) {
      throw new PracticeInvalidGenerationInputError(
        `At most ${PRACTICE_MAX_TAG_FILTER_COUNT} tag filters are allowed.`,
      );
    }

    for (const tagId of tagIds) {
      if (!isUuidV4(tagId)) {
        throw new PracticeInvalidGenerationInputError('Each tagId must be a UUID v4.');
      }
    }

    return {
      locale: this.resolveLocale(input.locale),
      curriculumId: input.curriculumId === undefined ? null : normalizeUuid(input.curriculumId),
      canonicalLessonKey:
        input.canonicalLessonKey === undefined ? null : normalizeUuid(input.canonicalLessonKey),
      tagIds: tagIds.map((tagId) => normalizeUuid(tagId)),
      tagCodes: [...tagCodes],
      questionTypes: input.questionTypes === undefined ? [] : [...input.questionTypes],
      difficulty: input.difficulty ?? null,
      questionCount,
      randomizeQuestions: input.randomizeQuestions ?? true,
      randomizeOptions: input.randomizeOptions ?? true,
    };
  }

  private resolveLocale(rawLocale: string | undefined): string {
    if (rawLocale === undefined) {
      return PRACTICE_DEFAULT_LOCALE;
    }

    try {
      return parseSourceLocale(rawLocale);
    } catch {
      throw new PracticeInvalidGenerationInputError('locale must be a valid BCP 47-like locale.');
    }
  }

  private async assertEnrollmentEligible(
    enrollmentStatus: EnrollmentStatus,
    studentId: string,
    classId: string,
  ): Promise<void> {
    if (enrollmentStatus !== EnrollmentStatus.Active) {
      throw new PracticeEnrollmentNotEligibleError();
    }

    const student = await this.studentService.getStudentById(studentId);

    if (student.status !== StudentStatus.Active) {
      throw new PracticeEnrollmentNotEligibleError();
    }

    const classSnapshot = await this.classService.getClassById(classId);

    if (classSnapshot.status !== ClassStatus.Active) {
      throw new PracticeEnrollmentNotEligibleError();
    }
  }
}
