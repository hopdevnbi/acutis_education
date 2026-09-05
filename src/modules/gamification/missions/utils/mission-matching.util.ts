import { REWARD_EVENT_TYPES } from '../../application-events/contracts/reward-eligible-event.contract';
import {
  MissionConditionType,
  MissionDefinitionStatus,
  MissionScopeType,
} from '../enums/gamification.enums';
import type { RewardEligibleEvent } from '../../application-events/contracts/reward-eligible-event.contract';
import type { MissionDefinitionSnapshot } from '../interfaces/gamification.interfaces';

export function rewardEventTypeToMissionCondition(
  eventType: string,
): MissionConditionType | null {
  switch (eventType) {
    case REWARD_EVENT_TYPES.LearningLessonCompleted:
      return MissionConditionType.LessonsCompleted;
    case REWARD_EVENT_TYPES.PracticeCompleted:
      return MissionConditionType.PracticeCompleted;
    case REWARD_EVENT_TYPES.AttendanceSessionCompletedMark:
      return MissionConditionType.AttendancePresentOrLate;
    case REWARD_EVENT_TYPES.ExamCompleted:
      return MissionConditionType.ExamsCompleted;
    default:
      return null;
  }
}

export function isMissionEffectiveAt(
  mission: {
    readonly status: MissionDefinitionStatus;
    readonly startsAt: Date | null;
    readonly endsAt: Date | null;
  },
  at: Date,
): boolean {
  if (mission.status !== MissionDefinitionStatus.Active) {
    return false;
  }
  if (mission.startsAt && at < mission.startsAt) {
    return false;
  }
  if (mission.endsAt && at >= mission.endsAt) {
    return false;
  }
  return true;
}

export function doesMissionScopeMatchEvent(
  mission: Pick<MissionDefinitionSnapshot, 'scopeType' | 'parishId' | 'classId'>,
  event: RewardEligibleEvent,
): boolean {
  switch (mission.scopeType) {
    case MissionScopeType.Global:
      return true;
    case MissionScopeType.Parish:
      return mission.parishId != null && mission.parishId === event.parishId;
    case MissionScopeType.Class:
      return (
        mission.classId != null &&
        event.classId != null &&
        mission.classId === event.classId
      );
    default:
      return false;
  }
}

export function doesMissionMatchEvent(
  mission: MissionDefinitionSnapshot,
  event: RewardEligibleEvent,
  conditionType: MissionConditionType,
): boolean {
  if (mission.conditionType !== conditionType) {
    return false;
  }
  if (!isMissionEffectiveAt(mission, event.occurredAt)) {
    return false;
  }
  return doesMissionScopeMatchEvent(mission, event);
}

export function buildMissionCompletionReasonCode(missionCode: string): string {
  return `MISSION_COMPLETION:${missionCode}`;
}
