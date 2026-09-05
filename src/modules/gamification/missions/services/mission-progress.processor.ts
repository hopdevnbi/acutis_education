import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import {
  REWARD_EVENT_TYPES,
  type RewardEligibleEvent,
} from '../../../application-events/contracts/reward-eligible-event.contract';
import { PointSourceType } from '../../enums/gamification.enums';
import { PointLedgerDuplicateIdentityError } from '../../errors/gamification.errors';
import type { MissionDefinitionSnapshot } from '../../interfaces/gamification.interfaces';
import { PointLedgerService } from '../../points/services/point-ledger.service';
import {
  buildMissionCompletionReasonCode,
  doesMissionMatchEvent,
  rewardEventTypeToMissionCondition,
} from '../utils/mission-matching.util';
import { MissionService } from './mission.service';

export interface MissionProgressProcessorResult {
  readonly missionsProgressed: number;
  readonly missionsCompleted: number;
  /** Publish only after ingest transaction commits (listener responsibility). */
  readonly pendingMissionCompletedEvents: readonly RewardEligibleEvent[];
}

@Injectable()
export class MissionProgressProcessor {
  constructor(
    private readonly missionService: MissionService,
    private readonly pointLedgerService: PointLedgerService,
  ) {}

  async processEvent(
    event: RewardEligibleEvent,
    manager: EntityManager,
  ): Promise<MissionProgressProcessorResult> {
    const conditionType = rewardEventTypeToMissionCondition(event.eventType);
    if (!conditionType) {
      return {
        missionsProgressed: 0,
        missionsCompleted: 0,
        pendingMissionCompletedEvents: [],
      };
    }

    const candidates = await this.missionService.listActiveDefinitionsMatchingEventContext(
      {
        parishId: event.parishId,
        classId: event.classId ?? null,
        conditionType,
      },
      manager,
    );

    let missionsProgressed = 0;
    let missionsCompleted = 0;
    const pendingMissionCompletedEvents: RewardEligibleEvent[] = [];

    for (const mission of candidates) {
      if (!doesMissionMatchEvent(mission, event, conditionType)) {
        continue;
      }

      const { progress, newlyCompleted } = await this.missionService.applyEventIncrement(
        {
          missionDefinitionId: mission.id,
          studentId: event.studentId,
          enrollmentId: event.enrollmentId ?? null,
          targetCount: mission.targetCount,
          eventId: event.eventId,
          occurredAt: event.occurredAt,
        },
        manager,
      );

      missionsProgressed += 1;

      if (newlyCompleted) {
        missionsCompleted += 1;
        await this.appendCompletionBonusIfNeeded({
          mission,
          progressId: progress.id,
          studentId: event.studentId,
          enrollmentId: event.enrollmentId ?? null,
          parishId: event.parishId,
          academicYearId: event.academicYearId ?? null,
          manager,
        });

        pendingMissionCompletedEvents.push(
          this.buildMissionCompletedEvent({
            mission,
            progressId: progress.id,
            studentId: event.studentId,
            enrollmentId: event.enrollmentId ?? null,
            parishId: event.parishId,
            academicYearId: event.academicYearId ?? null,
            completedAt: progress.completedAt ?? event.occurredAt,
          }),
        );
      }
    }

    return {
      missionsProgressed,
      missionsCompleted,
      pendingMissionCompletedEvents,
    };
  }

  private async appendCompletionBonusIfNeeded(input: {
    readonly mission: MissionDefinitionSnapshot;
    readonly progressId: string;
    readonly studentId: string;
    readonly enrollmentId: string | null;
    readonly parishId: string;
    readonly academicYearId: string | null;
    readonly manager: EntityManager;
  }): Promise<void> {
    const bonus = input.mission.pointsBonus ?? 0;
    if (bonus <= 0) {
      return;
    }
    try {
      await this.pointLedgerService.append(
        {
          studentId: input.studentId,
          enrollmentId: input.enrollmentId,
          parishId: input.parishId,
          academicYearId: input.academicYearId,
          pointsDelta: bonus,
          sourceType: PointSourceType.MissionCompleted,
          sourceId: input.progressId,
          reasonCode: buildMissionCompletionReasonCode(input.mission.code),
          descriptionKey: `mission_completion.${input.mission.code}`,
          staffNote: null,
          awardedByUserId: null,
        },
        input.manager,
      );
    } catch (error: unknown) {
      if (error instanceof PointLedgerDuplicateIdentityError) {
        return;
      }
      throw error;
    }
  }

  private buildMissionCompletedEvent(input: {
    readonly mission: MissionDefinitionSnapshot;
    readonly progressId: string;
    readonly studentId: string;
    readonly enrollmentId: string | null;
    readonly parishId: string;
    readonly academicYearId: string | null;
    readonly completedAt: Date;
  }): RewardEligibleEvent {
    return {
      eventId: input.progressId,
      eventType: REWARD_EVENT_TYPES.MissionCompleted,
      occurredAt: input.completedAt,
      studentId: input.studentId,
      enrollmentId: input.enrollmentId,
      parishId: input.parishId,
      academicYearId: input.academicYearId,
      classId: input.mission.classId,
      sourceId: input.progressId,
      metadata: {
        missionCode: input.mission.code,
        missionScopeType: input.mission.scopeType,
      },
    };
  }
}
