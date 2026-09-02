import { Injectable } from '@nestjs/common';
import { parseLocale } from '../../../common/locale';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  LOCALIZATION_APPROVE_PERMISSION,
  LOCALIZATION_MANAGE_PERMISSION,
  LOCALIZATION_READ_PERMISSION,
} from '../constants/localization-permissions.constants';
import {
  LocalizationAccessDeniedError,
  LocalizationInvalidLocaleError,
  LocalizationTargetMatchesSourceError,
} from '../errors/localization-admin.errors';
import type { TranslationResourceSnapshot } from '../interfaces/localization.interface';

@Injectable()
export class LocalizationAccessService {
  constructor(
    private readonly parishScopeService: ParishScopeService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async assertCanReadResource(
    rawUserId: string,
    resource: TranslationResourceSnapshot,
  ): Promise<void> {
    if (!(await this.canReadResource(rawUserId, resource))) {
      throw new LocalizationAccessDeniedError();
    }
  }

  async assertCanManageResource(
    rawUserId: string,
    resource: TranslationResourceSnapshot,
  ): Promise<void> {
    if (!(await this.canManageResource(rawUserId, resource))) {
      throw new LocalizationAccessDeniedError();
    }
  }

  async assertCanApproveResource(
    rawUserId: string,
    resource: TranslationResourceSnapshot,
  ): Promise<void> {
    if (!(await this.canApproveResource(rawUserId, resource))) {
      throw new LocalizationAccessDeniedError();
    }
  }

  async canReadResource(
    rawUserId: string,
    resource: TranslationResourceSnapshot,
  ): Promise<boolean> {
    if (
      !(await this.accessControlService.userHasPermission(rawUserId, LOCALIZATION_READ_PERMISSION))
    ) {
      return false;
    }

    return this.hasParishScopeForResource(rawUserId, resource.parishId);
  }

  async canManageResource(
    rawUserId: string,
    resource: TranslationResourceSnapshot,
  ): Promise<boolean> {
    if (
      !(await this.accessControlService.userHasPermission(
        rawUserId,
        LOCALIZATION_MANAGE_PERMISSION,
      ))
    ) {
      return false;
    }

    return this.hasParishScopeForResource(rawUserId, resource.parishId);
  }

  async canApproveResource(
    rawUserId: string,
    resource: TranslationResourceSnapshot,
  ): Promise<boolean> {
    if (
      !(await this.accessControlService.userHasPermission(
        rawUserId,
        LOCALIZATION_APPROVE_PERMISSION,
      ))
    ) {
      return false;
    }

    return this.hasParishScopeForResource(rawUserId, resource.parishId);
  }

  async resolveListParishScope(
    rawUserId: string,
    requestedParishId: string | null | undefined,
  ): Promise<string[] | null> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      if (requestedParishId === null || requestedParishId === undefined) {
        return null;
      }

      return [requestedParishId];
    }

    const parishIds = await this.parishScopeService.listActiveParishIdsForMember(rawUserId);

    if (parishIds.length === 0) {
      throw new LocalizationAccessDeniedError();
    }

    if (requestedParishId === null || requestedParishId === undefined) {
      return parishIds;
    }

    if (!parishIds.includes(requestedParishId)) {
      throw new LocalizationAccessDeniedError();
    }

    return [requestedParishId];
  }

  parseTargetLocale(rawTargetLocale: string, sourceLocale: string): string {
    try {
      const targetLocale = parseLocale(rawTargetLocale);
      const normalizedSourceLocale = parseLocale(sourceLocale);

      if (targetLocale === normalizedSourceLocale) {
        throw new LocalizationTargetMatchesSourceError();
      }

      return targetLocale;
    } catch (error: unknown) {
      if (error instanceof LocalizationInvalidLocaleError) {
        throw error;
      }

      throw new LocalizationInvalidLocaleError();
    }
  }

  private async hasParishScopeForResource(
    rawUserId: string,
    parishId: string | null,
  ): Promise<boolean> {
    if (await this.parishScopeService.isSuperAdmin(rawUserId)) {
      return true;
    }

    if (parishId === null) {
      return false;
    }

    return this.parishScopeService.hasActiveParishMembership(rawUserId, parishId);
  }
}
