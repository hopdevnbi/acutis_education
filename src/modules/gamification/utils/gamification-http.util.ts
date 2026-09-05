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
  BadgeAlreadyAwardedError,
  BadgeAlreadyRevokedError,
  BadgeAwardNotAllowedError,
  BadgeAwardNotFoundError,
  BadgeDefinitionCodeAlreadyExistsError,
  BadgeDefinitionNotActiveError,
  BadgeDefinitionNotFoundError,
  BadgeNotFoundError,
  GamificationAccessDeniedError,
  InvalidBadgeRuleConfigError,
  InvalidBadgeScopeError,
  InvalidMilestoneTriggerConfigError,
  InvalidPointAdjustmentError,
  InvalidRewardRuleScopeError,
  MilestoneDefinitionAccessDeniedError,
  MilestoneDefinitionCodeAlreadyExistsError,
  MilestoneDefinitionNotActiveError,
  MilestoneDefinitionNotFoundError,
  MilestoneNotFoundError,
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
    error instanceof MilestoneDefinitionAccessDeniedError ||
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
    error instanceof PointLedgerEntryNotFoundError ||
    error instanceof BadgeDefinitionNotFoundError ||
    error instanceof BadgeNotFoundError ||
    error instanceof BadgeAwardNotFoundError ||
    error instanceof MilestoneDefinitionNotFoundError ||
    error instanceof MilestoneNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof PointLedgerEntryAlreadyReversedError ||
    error instanceof PointLedgerDuplicateIdentityError ||
    error instanceof RewardRuleCodeAlreadyExistsError ||
    error instanceof BadgeDefinitionCodeAlreadyExistsError ||
    error instanceof BadgeAlreadyAwardedError ||
    error instanceof BadgeAlreadyRevokedError ||
    error instanceof MilestoneDefinitionCodeAlreadyExistsError
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
    error instanceof InvalidEnrollmentIdError ||
    error instanceof InvalidBadgeScopeError ||
    error instanceof InvalidBadgeRuleConfigError ||
    error instanceof InvalidMilestoneTriggerConfigError ||
    error instanceof BadgeDefinitionNotActiveError ||
    error instanceof BadgeAwardNotAllowedError ||
    error instanceof MilestoneDefinitionNotActiveError
  ) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
