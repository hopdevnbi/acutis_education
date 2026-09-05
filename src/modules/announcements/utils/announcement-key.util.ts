import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CommunicationTargetType } from '../enums/announcement.enums';
import { InvalidAnnouncementTargetError } from '../errors/announcement.errors';

export function buildAnnouncementTargetKey(input: {
  readonly targetType: CommunicationTargetType;
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}): string {
  switch (input.targetType) {
    case CommunicationTargetType.Global:
      if (input.parishId || input.classId || input.roleCode) {
        throw new InvalidAnnouncementTargetError('Global targets must not set parish, class, or role.');
      }
      return 'GLOBAL';

    case CommunicationTargetType.Parish:
      if (!input.parishId) {
        throw new InvalidAnnouncementTargetError('Parish targets must specify parishId.');
      }
      return `PARISH:${normalizeUuid(input.parishId)}`;

    case CommunicationTargetType.Class:
      if (!input.classId) {
        throw new InvalidAnnouncementTargetError('Class targets must specify classId.');
      }
      return `CLASS:${normalizeUuid(input.classId)}`;

    case CommunicationTargetType.Role:
      if (!input.roleCode || input.roleCode.trim().length === 0) {
        throw new InvalidAnnouncementTargetError('Role targets must specify a non-empty roleCode.');
      }
      if (!input.parishId) {
        throw new InvalidAnnouncementTargetError('Role targets in MVP require parishId scoping.');
      }
      return `ROLE:${normalizeUuid(input.parishId)}:${input.roleCode.trim().toUpperCase()}`;

    default:
      throw new InvalidAnnouncementTargetError('Unknown communication target type.');
  }
}
