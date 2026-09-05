import { Injectable } from '@nestjs/common';
import type {
  AnnouncementAdminListFilter,
  AnnouncementFeedFilter,
  AnnouncementFeedItemSnapshot,
  AnnouncementPaginatedResult,
  AnnouncementTargetSnapshot,
  AnnouncementUserStateSnapshot,
  AnnouncementWithTargetsSnapshot,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from './interfaces/announcement.interfaces';
import { AnnouncementTargetService } from './services/announcement-target.service';
import { AnnouncementUserStateService } from './services/announcement-user-state.service';
import { AnnouncementInternalService } from './services/announcement.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly announcementInternalService: AnnouncementInternalService,
    private readonly announcementTargetService: AnnouncementTargetService,
    private readonly announcementUserStateService: AnnouncementUserStateService,
  ) {}

  async createAnnouncement(
    input: CreateAnnouncementInput,
  ): Promise<AnnouncementWithTargetsSnapshot> {
    return this.announcementInternalService.create(input);
  }

  async getAnnouncementById(id: string): Promise<AnnouncementWithTargetsSnapshot> {
    return this.announcementInternalService.getById(id);
  }

  async updateAnnouncement(
    id: string,
    input: UpdateAnnouncementInput,
  ): Promise<AnnouncementWithTargetsSnapshot> {
    return this.announcementInternalService.update(id, input);
  }

  async publishAnnouncement(
    id: string,
    updatedByUserId: string,
  ): Promise<AnnouncementWithTargetsSnapshot> {
    return this.announcementInternalService.publish(id, updatedByUserId);
  }

  async archiveAnnouncement(
    id: string,
    updatedByUserId: string,
  ): Promise<AnnouncementWithTargetsSnapshot> {
    return this.announcementInternalService.archive(id, updatedByUserId);
  }

  async findAdminList(
    filter: AnnouncementAdminListFilter,
  ): Promise<AnnouncementPaginatedResult<AnnouncementWithTargetsSnapshot>> {
    return this.announcementInternalService.findAdminList(filter);
  }

  async findUserFeed(
    filter: AnnouncementFeedFilter,
    now?: Date,
  ): Promise<AnnouncementPaginatedResult<AnnouncementFeedItemSnapshot>> {
    return this.announcementInternalService.findUserFeed(filter, now);
  }

  async getUserFeedItemById(
    id: string,
    userId: string,
    audienceKeys: readonly string[],
    now?: Date,
  ): Promise<AnnouncementFeedItemSnapshot | null> {
    return this.announcementInternalService.getUserFeedItemById(id, userId, audienceKeys, now);
  }

  async dismissAnnouncement(
    id: string,
    userId: string,
  ): Promise<AnnouncementUserStateSnapshot> {
    return this.announcementUserStateService.markDismissed(id, userId);
  }

  async markSeen(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot> {
    return this.announcementUserStateService.markSeen(announcementId, userId);
  }

  async markRead(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot> {
    return this.announcementUserStateService.markRead(announcementId, userId);
  }

  async listTargets(announcementId: string): Promise<readonly AnnouncementTargetSnapshot[]> {
    return this.announcementTargetService.listTargetsByAnnouncementId(announcementId);
  }

  async getUserState(
    announcementId: string,
    userId: string,
  ): Promise<AnnouncementUserStateSnapshot | null> {
    return this.announcementUserStateService.getState(announcementId, userId);
  }
}
