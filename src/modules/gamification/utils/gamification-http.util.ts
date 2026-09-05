import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClassScopeAccessDeniedError } from '../../class/errors/class-scope.errors';
import {
  EnrollmentNotFoundError,
  InvalidEnrollmentIdError,
} from '../../enrollment/errors/enrollment.errors';
import { ParishScopeAccessDeniedError } from '../../parish/errors/parish-scope.errors';
import {
  InvalidStudentIdError,
  StudentNotFoundError,
} from '../../student/errors/student.errors';
import { LearnerSelfScopeDeniedError } from '../../student/errors/student-access.errors';
import {
  GamificationAccessDeniedError,
  InvalidPointAdjustmentError,
  InvalidRewardRuleScopeError,
  PointLedgerDuplicateIdentityError,
  PointLedgerEntryAlreadyReversedError,
  PointLedgerEntryNotFoundError,
  RewardRuleCodeAlreadyExistsError,
  RewardRuleConfigurationError,
  RewardRuleNotFoundError,
  StudentGamificationContextNotFoundError,
  ZeroPointsDeltaError,
} from '../errors/gamification.errors';

export function rethrowGamificationServiceError(error: unknown): never {
  if (
    error instanceof GamificationAccessDeniedError ||
    error instanceof ClassScopeAccessDeniedError ||
    error instanceof ParishScopeAccessDeniedError ||
    error instanceof LearnerSelfScopeDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }

  if (
    error instanceof StudentNotFoundError ||
    error instanceof EnrollmentNotFoundError ||
    error instanceof RewardRuleNotFoundError ||
    error instanceof PointLedgerEntryNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof PointLedgerEntryAlreadyReversedError ||
    error instanceof PointLedgerDuplicateIdentityError ||
    error instanceof RewardRuleCodeAlreadyExistsError
  ) {
    throw new ConflictException(error.message);
  }

  if (error instanceof StudentGamificationContextNotFoundError) {
    throw new UnprocessableEntityException(error.message);
  }

  if (
    error instanceof InvalidPointAdjustmentError ||
    error instanceof ZeroPointsDeltaError ||
    error instanceof InvalidRewardRuleScopeError ||
    error instanceof RewardRuleConfigurationError ||
    error instanceof InvalidStudentIdError ||
    error instanceof InvalidEnrollmentIdError
  ) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
