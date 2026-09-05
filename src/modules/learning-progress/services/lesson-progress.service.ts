import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  APPLICATION_EVENT_PUBLISHER,
  REWARD_EVENT_TYPES,
  type ApplicationEventPublisher,
} from '../../application-events';
import { CanonicalLessonKeyNotInCurriculumError } from '../../curriculum/errors/curriculum.errors';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { ClassService } from '../../class/services/class.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import type { EnrollmentSnapshot } from '../../enrollment/interfaces/enrollment.interface';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { LessonProgressEntity } from '../entities/lesson-progress.entity';
import {
  LessonProgressPersistedStatus,
  LessonProgressStatus,
  type LessonProgressTargetStatus,
} from '../enums/lesson-progress-status.enum';
import {
  LearningProgressCanonicalLessonInvalidError,
  LearningProgressEnrollmentNotWritableError,
  LessonProgressInvalidTargetStatusError,
} from '../errors/learning-progress.errors';
import type {
  GetLessonProgressInput,
  LessonProgressSnapshot,
  ListEnrollmentLessonProgressInput,
  ResolvedLessonProgressContext,
  SetLessonProgressInput,
} from '../interfaces/lesson-progress.interface';
import {
  assertLessonProgressTransition,
  isLessonProgressTransitionNoop,
} from '../utils/lesson-progress-transition.util';
import { LearningProgressAccessService } from './learning-progress-access.service';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(LessonProgressEntity)
    private readonly lessonProgressRepository: Repository<LessonProgressEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly enrollmentService: EnrollmentService,
    private readonly classService: ClassService,
    private readonly curriculumService: CurriculumService,
    private readonly learningProgressAccessService: LearningProgressAccessService,
    @Inject(APPLICATION_EVENT_PUBLISHER)
    private readonly applicationEventPublisher: ApplicationEventPublisher,
  ) {}

  async getLessonProgress(input: GetLessonProgressInput): Promise<LessonProgressSnapshot> {
    const context = await this.resolveLessonProgressContext(
      input.enrollmentId,
      input.canonicalLessonKey,
    );
    const row = await this.findProgressRow(context);

    if (row === null) {
      return this.buildNotStartedSnapshot(context);
    }

    return this.toSnapshot(row);
  }

  async setLessonProgress(input: SetLessonProgressInput): Promise<LessonProgressSnapshot> {
    this.assertValidTargetStatus(input.targetStatus);

    const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);
    this.assertEnrollmentWritable(enrollment);

    await this.learningProgressAccessService.assertCanManageLessonProgress(
      input.actorUserId,
      enrollment.studentId,
    );

    const context = await this.resolveLessonProgressContext(
      input.enrollmentId,
      input.canonicalLessonKey,
    );

    const enrollmentForEmit = enrollment;

    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(LessonProgressEntity);
      let row = await this.findProgressRowForUpdate(repository, context);
      let newlyCompleted = false;

      if (row === null) {
        try {
          const inserted = await this.insertLessonProgressRow(
            repository,
            context,
            input.targetStatus,
            input.actorUserId,
          );
          newlyCompleted = input.targetStatus === LessonProgressStatus.Completed;
          return { snapshot: inserted, newlyCompleted };
        } catch (error: unknown) {
          if (!isUniqueConstraintViolation(error)) {
            throw error;
          }

          row = await this.findProgressRowForUpdate(repository, context);

          if (row === null) {
            throw error;
          }
        }
      }

      const beforeStatus = this.toPublicStatus(row.status);
      const snapshot = await this.applyTransitionToExistingRow(
        repository,
        row,
        input.targetStatus,
        input.actorUserId,
      );
      newlyCompleted =
        input.targetStatus === LessonProgressStatus.Completed &&
        beforeStatus !== LessonProgressStatus.Completed &&
        !isLessonProgressTransitionNoop(beforeStatus, input.targetStatus);

      return { snapshot, newlyCompleted };
    });

    if (result.newlyCompleted && result.snapshot.id) {
      await this.applicationEventPublisher.publishRewardEligibleEvent({
        eventId: result.snapshot.id,
        eventType: REWARD_EVENT_TYPES.LearningLessonCompleted,
        occurredAt: result.snapshot.completedAt ?? new Date(),
        studentId: enrollmentForEmit.studentId,
        enrollmentId: enrollmentForEmit.id,
        classId: enrollmentForEmit.classId,
        parishId: enrollmentForEmit.parishId,
        academicYearId: enrollmentForEmit.academicYearId,
        sourceId: result.snapshot.id,
        metadata: { canonicalLessonKey: result.snapshot.canonicalLessonKey },
      });
    }

    return result.snapshot;
  }

  async listEnrollmentLessonProgress(
    input: ListEnrollmentLessonProgressInput,
  ): Promise<LessonProgressSnapshot[]> {
    const enrollment = await this.enrollmentService.getEnrollmentById(input.enrollmentId);
    const rows = await this.lessonProgressRepository.find({
      where: {
        enrollmentId: normalizeUuid(enrollment.id),
        ...(input.curriculumId === undefined
          ? {}
          : { curriculumId: normalizeUuid(input.curriculumId) }),
      },
      order: { updatedAt: 'DESC' },
    });

    return rows.map((row) => this.toSnapshot(row));
  }

  private assertValidTargetStatus(targetStatus: LessonProgressTargetStatus): void {
    if (
      targetStatus !== LessonProgressStatus.InProgress &&
      targetStatus !== LessonProgressStatus.Completed
    ) {
      throw new LessonProgressInvalidTargetStatusError();
    }
  }

  private assertEnrollmentWritable(enrollment: EnrollmentSnapshot): void {
    if (enrollment.status !== EnrollmentStatus.Active) {
      throw new LearningProgressEnrollmentNotWritableError();
    }
  }

  private async resolveLessonProgressContext(
    rawEnrollmentId: string,
    rawCanonicalLessonKey: string,
  ): Promise<ResolvedLessonProgressContext> {
    if (!isUuidV4(rawCanonicalLessonKey)) {
      throw new LearningProgressCanonicalLessonInvalidError();
    }

    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);
    const classSnapshot = await this.classService.getClassById(enrollment.classId);
    const assignedVersion = await this.curriculumService.getPublishedVersionForAssignment(
      classSnapshot.parishId,
      classSnapshot.academicYearId,
      classSnapshot.catechismLevelId,
    );

    try {
      await this.curriculumService.assertCanonicalLessonKeyBelongsToVersion(
        assignedVersion.id,
        rawCanonicalLessonKey,
      );
    } catch (error: unknown) {
      if (error instanceof CanonicalLessonKeyNotInCurriculumError) {
        throw new LearningProgressCanonicalLessonInvalidError();
      }

      throw error;
    }

    return {
      enrollmentId: normalizeUuid(enrollment.id),
      curriculumId: normalizeUuid(assignedVersion.curriculumId),
      assignedCurriculumVersionId: normalizeUuid(assignedVersion.id),
      canonicalLessonKey: normalizeUuid(rawCanonicalLessonKey),
    };
  }

  private async findProgressRow(
    context: ResolvedLessonProgressContext,
  ): Promise<LessonProgressEntity | null> {
    return this.lessonProgressRepository.findOne({
      where: {
        enrollmentId: normalizeUuid(context.enrollmentId),
        curriculumId: normalizeUuid(context.curriculumId),
        canonicalLessonKey: normalizeUuid(context.canonicalLessonKey),
      },
    });
  }

  private findProgressRowForUpdate(
    repository: Repository<LessonProgressEntity>,
    context: ResolvedLessonProgressContext,
  ): Promise<LessonProgressEntity | null> {
    return repository.findOne({
      where: {
        enrollmentId: normalizeUuid(context.enrollmentId),
        curriculumId: normalizeUuid(context.curriculumId),
        canonicalLessonKey: normalizeUuid(context.canonicalLessonKey),
      },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async insertLessonProgressRow(
    repository: Repository<LessonProgressEntity>,
    context: ResolvedLessonProgressContext,
    targetStatus: LessonProgressTargetStatus,
    actorUserId: string,
  ): Promise<LessonProgressSnapshot> {
    const now = new Date();
    const row = new LessonProgressEntity();
    row.enrollmentId = normalizeUuid(context.enrollmentId);
    row.curriculumId = normalizeUuid(context.curriculumId);
    row.canonicalLessonKey = normalizeUuid(context.canonicalLessonKey);
    row.assignedCurriculumVersionId = normalizeUuid(context.assignedCurriculumVersionId);
    row.startedAt = now;
    row.startedByUserId = normalizeUuid(actorUserId);

    if (targetStatus === LessonProgressStatus.InProgress) {
      row.status = LessonProgressPersistedStatus.InProgress;
      row.completedAt = null;
      row.completedByUserId = null;
    } else {
      row.status = LessonProgressPersistedStatus.Completed;
      row.completedAt = now;
      row.completedByUserId = normalizeUuid(actorUserId);
    }

    const savedRow = await repository.save(row);

    return this.toSnapshot(savedRow);
  }

  private async applyTransitionToExistingRow(
    repository: Repository<LessonProgressEntity>,
    row: LessonProgressEntity,
    targetStatus: LessonProgressTargetStatus,
    actorUserId: string,
  ): Promise<LessonProgressSnapshot> {
    const currentStatus = this.toPublicStatus(row.status);

    assertLessonProgressTransition(currentStatus, targetStatus);

    if (isLessonProgressTransitionNoop(currentStatus, targetStatus)) {
      return this.toSnapshot(row);
    }

    if (targetStatus === LessonProgressStatus.Completed) {
      row.status = LessonProgressPersistedStatus.Completed;
      row.completedAt = new Date();
      row.completedByUserId = normalizeUuid(actorUserId);
    }

    const savedRow = await repository.save(row);

    return this.toSnapshot(savedRow);
  }

  private buildNotStartedSnapshot(context: ResolvedLessonProgressContext): LessonProgressSnapshot {
    return {
      id: null,
      enrollmentId: context.enrollmentId,
      curriculumId: context.curriculumId,
      canonicalLessonKey: context.canonicalLessonKey,
      assignedCurriculumVersionId: context.assignedCurriculumVersionId,
      status: LessonProgressStatus.NotStarted,
      startedAt: null,
      completedAt: null,
    };
  }

  private toSnapshot(row: LessonProgressEntity): LessonProgressSnapshot {
    return {
      id: row.id === null ? null : normalizeUuid(row.id),
      enrollmentId: normalizeUuid(row.enrollmentId),
      curriculumId: normalizeUuid(row.curriculumId),
      canonicalLessonKey: normalizeUuid(row.canonicalLessonKey),
      assignedCurriculumVersionId: normalizeUuid(row.assignedCurriculumVersionId),
      status: this.toPublicStatus(row.status),
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  }

  private toPublicStatus(status: LessonProgressPersistedStatus): LessonProgressStatus {
    if (status === LessonProgressPersistedStatus.Completed) {
      return LessonProgressStatus.Completed;
    }

    return LessonProgressStatus.InProgress;
  }
}
