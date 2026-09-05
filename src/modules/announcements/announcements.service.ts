import { Injectable } from '@nestjs/common';
import type {
  AnnouncementSnapshot,
  AnnouncementTargetSnapshot,
  AnnouncementUserStateSnapshot,
  CreateAnnouncementInput,
  CreateAnnouncementTargetInput,
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

  async createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementSnapshot> {
    return this.announcementInternalService.create(input);
  }

  async getAnnouncementById(id: string): Promise<AnnouncementSnapshot> {
    return this.announcementInternalService.getById(id);
  }

  async updateAnnouncement(
    id: string,
    input: UpdateAnnouncementInput,
  ): Promise<AnnouncementSnapshot> {
    return this.announcementInternalService.update(id, input);
  }

  async publishAnnouncement(id: string, updatedByUserId: string): Promise<AnnouncementSnapshot> {
    return this.announcementInternalService.publish(id, updatedByUserId);
  }

  async archiveAnnouncement(id: string, updatedByUserId: string): Promise<AnnouncementSnapshot> {
    return this.announcementInternalService.archive(id, updatedByUserId);
  }

  async addTarget(input: CreateAnnouncementTargetInput): Promise<AnnouncementTargetSnapshot> {
    return this.announcementTargetService.addTarget(input);
  }

  async listTargets(announcementId: string): Promise<readonly AnnouncementTargetSnapshot[]> {
    return this.announcementTargetService.listTargetsByAnnouncementId(announcementId);
  }

  async markSeen(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot> {
    return this.announcementUserStateService.markSeen(announcementId, userId);
  }

  async markRead(announcementId: string, userId: string): Promise<AnnouncementUserStateSnapshot> {
    return this.announcementUserStateService.markRead(announcementId, userId);
  }

  async markDismissed(
    announcementId: string,
    userId: string,
  ): Promise<AnnouncementUserStateSnapshot> {
    return this.announcementUserStateService.markDismissed(announcementId, userId);
  }

  async getUserState(
    announcementId: string,
    userId: string,
  ): Promise<AnnouncementUserStateSnapshot | null> {
    return this.announcementUserStateService.getState(announcementId, userId);
  }
}
