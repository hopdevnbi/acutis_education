import { Injectable } from '@nestjs/common';
import { generateUuidV4 } from '../../../database/uuid-v4.util';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { POINT_ADJUSTMENT_MAX_ABS_DELTA } from '../constants/gamification-permissions.constants';
import {
  MANUAL_ADJUSTMENT_REASON_CODE,
  MANUAL_ADJUSTMENT_REASON_MAX_LENGTH,
} from '../constants/gamification.constants';
import { PointSourceType } from '../enums/gamification.enums';
import {
  InvalidPointAdjustmentError,
  StudentGamificationContextNotFoundError,
} from '../errors/gamification.errors';
import type {
  ManualPointAdjustmentInput,
  PointLedgerEntrySnapshot,
  StudentGamificationContext,
} from '../interfaces/gamification.interfaces';
import { GamificationAccessService } from '../access/gamification-access.service';
import { PointLedgerService } from './point-ledger.service';

@Injectable()
export class PointAdjustmentService {
  constructor(
    private readonly pointLedgerService: PointLedgerService,
    private readonly gamificationAccessService: GamificationAccessService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
  ) {}

  async resolveActiveContextForStudent(
    rawStudentId: string,
  ): Promise<StudentGamificationContext> {
    const enrollments =
      await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([rawStudentId]);
    const active = enrollments.find((row) => row.status === EnrollmentStatus.Active) ?? enrollments[0];
    if (!active) {
      throw new StudentGamificationContextNotFoundError();
    }
    return {
      studentId: active.studentId,
      enrollmentId: active.id,
      parishId: active.parishId,
      academicYearId: active.academicYearId,
      classId: active.classId,
    };
  }

  async adjustPoints(input: ManualPointAdjustmentInput): Promise<PointLedgerEntrySnapshot> {
    await this.gamificationAccessService.assertStaffCanAdjustStudentPoints(
      input.actorUserId,
      input.studentId,
    );

    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw new InvalidPointAdjustmentError('delta must be a non-zero integer.');
    }
    if (Math.abs(input.delta) > POINT_ADJUSTMENT_MAX_ABS_DELTA) {
      throw new InvalidPointAdjustmentError(
        `delta absolute value must be <= ${POINT_ADJUSTMENT_MAX_ABS_DELTA}.`,
      );
    }
    const reason = input.reason.trim();
    if (reason.length < 1 || reason.length > MANUAL_ADJUSTMENT_REASON_MAX_LENGTH) {
      throw new InvalidPointAdjustmentError(
        `reason must be 1..${MANUAL_ADJUSTMENT_REASON_MAX_LENGTH} characters.`,
      );
    }

    const context = await this.resolveActiveContextForStudent(input.studentId);
    await this.gamificationAccessService.assertStaffCanAdjustStudentInContext(
      input.actorUserId,
      context,
    );

    return this.pointLedgerService.append({
      studentId: context.studentId,
      enrollmentId: context.enrollmentId,
      parishId: context.parishId,
      academicYearId: context.academicYearId,
      pointsDelta: input.delta,
      sourceType:
        input.delta > 0 ? PointSourceType.ManualAward : PointSourceType.Adjustment,
      sourceId: generateUuidV4(),
      reasonCode: MANUAL_ADJUSTMENT_REASON_CODE,
      descriptionKey: 'points.manual_adjustment',
      staffNote: reason,
      awardedByUserId: input.actorUserId,
    });
  }

  async reverseLedgerEntry(input: {
    readonly originalEntryId: string;
    readonly actorUserId: string;
    readonly reason: string;
  }): Promise<PointLedgerEntrySnapshot> {
    const original = await this.pointLedgerService.getById(input.originalEntryId);
    await this.gamificationAccessService.assertStaffCanAdjustStudentPoints(
      input.actorUserId,
      original.studentId,
    );
    const reason = input.reason.trim();
    if (reason.length < 1 || reason.length > MANUAL_ADJUSTMENT_REASON_MAX_LENGTH) {
      throw new InvalidPointAdjustmentError(
        `reason must be 1..${MANUAL_ADJUSTMENT_REASON_MAX_LENGTH} characters.`,
      );
    }
    return this.pointLedgerService.reverseEntry({
      originalEntryId: original.id,
      awardedByUserId: input.actorUserId,
      staffNote: reason,
    });
  }
}
