import { Injectable } from '@nestjs/common';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { AccessControlService } from '../../access-control/services/access-control.service';
import {
  MEDIA_MANAGE_PERMISSION,
  MEDIA_READ_PERMISSION,
} from '../constants/media-permissions.constants';
import { MediaAssetAccessDeniedError } from '../errors/media-asset.errors';
import type { MediaAssetAccessRecord } from '../interfaces/media-asset.interface';
import { MediaAssetService } from './media-asset.service';

@Injectable()
export class MediaAccessService {
  constructor(
    private readonly mediaAssetService: MediaAssetService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async getReadableAssetRecord(assetId: string, userId: string): Promise<MediaAssetAccessRecord> {
    const accessRecord = await this.mediaAssetService.getAssetAccessRecord(assetId);

    if (await this.canReadAsset(userId, accessRecord)) {
      return accessRecord;
    }

    throw new MediaAssetAccessDeniedError();
  }

  async canReadAsset(userId: string, accessRecord: MediaAssetAccessRecord): Promise<boolean> {
    const normalizedUserId = normalizeUuid(userId);

    if (accessRecord.createdByUserId !== null) {
      if (normalizeUuid(accessRecord.createdByUserId) === normalizedUserId) {
        return true;
      }
    }

    if (await this.accessControlService.userHasPermission(userId, MEDIA_MANAGE_PERMISSION)) {
      return true;
    }

    return this.accessControlService.userHasPermission(userId, MEDIA_READ_PERMISSION);
  }
}
