import { Injectable, Logger } from '@nestjs/common';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { AccessControlService } from '../../access-control/services/access-control.service';
import type { CommunicationTargetDescriptor } from '../../application-events/contracts/communication-events.contract';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { ParishMembershipService } from '../../parish/services/parish-membership.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { StudentService } from '../../student/services/student.service';
import { UserAccountService } from '../../users/services/user-account.service';
import { NOTIFICATION_GLOBAL_PAGE_SIZE } from '../constants/notifications-permissions.constants';
import { InvalidNotificationTargetError } from '../errors/notification.errors';

@Injectable()
export class NotificationAudienceResolver {
  private readonly logger = new Logger(NotificationAudienceResolver.name);

  constructor(
    private readonly userAccountService: UserAccountService,
    private readonly parishMembershipService: ParishMembershipService,
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly studentService: StudentService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly accessControlService: AccessControlService,
  ) {}

  /**
   * Expands an array of communication target descriptors into a deduplicated set
   * of eligible recipient user IDs using exported public service methods only.
   */
  async expandTargets(
    targets: readonly CommunicationTargetDescriptor[],
  ): Promise<Set<string>> {
    const recipientUserIds = new Set<string>();

    for (const target of targets) {
      switch (target.targetType) {
        case 'GLOBAL': {
          await this.expandGlobalTarget(recipientUserIds);
          break;
        }

        case 'PARISH': {
          if (!target.parishId || !isUuidV4(target.parishId)) {
            this.logger.warn({
              action: 'notification.target_expansion.invalid_parish_target',
              target,
            });
            throw new InvalidNotificationTargetError(
              'PARISH target requires a valid parishId UUID.',
            );
          }
          await this.expandParishTarget(target.parishId, recipientUserIds);
          break;
        }

        case 'CLASS': {
          if (!target.classId || !isUuidV4(target.classId)) {
            this.logger.warn({
              action: 'notification.target_expansion.invalid_class_target',
              target,
            });
            throw new InvalidNotificationTargetError(
              'CLASS target requires a valid classId UUID.',
            );
          }
          await this.expandClassTarget(target.classId, recipientUserIds);
          break;
        }

        case 'ROLE': {
          if (
            !target.parishId ||
            !isUuidV4(target.parishId) ||
            !target.roleCode ||
            target.roleCode.trim().length === 0
          ) {
            this.logger.warn({
              action: 'notification.target_expansion.invalid_role_target',
              target,
            });
            throw new InvalidNotificationTargetError(
              'ROLE target requires a valid parishId UUID and non-empty roleCode.',
            );
          }
          await this.expandRoleTarget(
            target.parishId,
            target.roleCode.trim(),
            recipientUserIds,
          );
          break;
        }

        default: {
          this.logger.warn({
            action: 'notification.target_expansion.unsupported_target_type',
            target,
          });
          break;
        }
      }
    }

    return recipientUserIds;
  }

  /**
   * GLOBAL: Enumerates active platform users in bounded pages without unbounded memory load.
   */
  private async expandGlobalTarget(recipientUserIds: Set<string>): Promise<void> {
    let skip = 0;
    const take = NOTIFICATION_GLOBAL_PAGE_SIZE;

    while (true) {
      const batch = await this.userAccountService.listActiveUserIds({ skip, take });
      for (const userId of batch) {
        recipientUserIds.add(normalizeUuid(userId));
      }

      if (batch.length < take) {
        break;
      }

      skip += take;
    }
  }

  /**
   * PARISH: Retrieves active members of the specified parish.
   */
  private async expandParishTarget(
    parishId: string,
    recipientUserIds: Set<string>,
  ): Promise<void> {
    const memberUserIds =
      await this.parishMembershipService.listActiveUserIdsByParishId(parishId);
    for (const userId of memberUserIds) {
      recipientUserIds.add(normalizeUuid(userId));
    }
  }

  /**
   * CLASS: Resolves active catechists, active enrolled students with user accounts,
   * and active guardians/parents of active enrolled students in batch (zero N+1).
   */
  private async expandClassTarget(
    classId: string,
    recipientUserIds: Set<string>,
  ): Promise<void> {
    // 1. Active assigned catechists
    const catechistUserIds =
      await this.classCatechistAssignmentService.listActiveCatechistUserIdsByClassId(classId);
    for (const userId of catechistUserIds) {
      recipientUserIds.add(normalizeUuid(userId));
    }

    // 2. Active enrolled students in this class
    const studentIds =
      await this.enrollmentQueryService.listActiveStudentIdsInClasses([classId]);

    if (studentIds.length > 0) {
      // 3. Linked student user accounts
      const studentUserIds =
        await this.studentService.listLinkedUserIdsByStudentIds(studentIds);
      for (const userId of studentUserIds) {
        recipientUserIds.add(normalizeUuid(userId));
      }

      // 4. Active guardians of enrolled students (batched, deduplicated)
      const guardianUserIds =
        await this.studentGuardianService.listActiveGuardianUserIdsByStudentIds(studentIds);
      for (const userId of guardianUserIds) {
        recipientUserIds.add(normalizeUuid(userId));
      }
    }
  }

  /**
   * ROLE: Resolves users holding the role who also have active membership in the specified parish.
   */
  private async expandRoleTarget(
    parishId: string,
    roleCode: string,
    recipientUserIds: Set<string>,
  ): Promise<void> {
    const [roleUserIds, parishUserIds] = await Promise.all([
      this.accessControlService.listUserIdsByRoleCode(roleCode),
      this.parishMembershipService.listActiveUserIdsByParishId(parishId),
    ]);

    const parishUserSet = new Set(parishUserIds.map((id) => normalizeUuid(id)));

    for (const userId of roleUserIds) {
      const normalized = normalizeUuid(userId);
      if (parishUserSet.has(normalized)) {
        recipientUserIds.add(normalized);
      }
    }
  }
}
