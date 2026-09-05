import { Injectable } from '@nestjs/common';
import type {
  AdminCmsListFilter,
  CmsEntrySnapshot,
  CmsPaginatedResult,
  CmsScheduledPublishResult,
  CreateCmsEntryInput,
  PublicCmsListFilter,
  UpdateCmsEntryInput,
} from './interfaces/cms.interfaces';
import { CmsEntryService } from './services/cms-entry.service';

@Injectable()
export class CmsService {
  constructor(private readonly cmsEntryService: CmsEntryService) {}

  async createEntry(input: CreateCmsEntryInput): Promise<CmsEntrySnapshot> {
    return this.cmsEntryService.create(input);
  }

  async getEntryById(id: string): Promise<CmsEntrySnapshot> {
    return this.cmsEntryService.getById(id);
  }

  async updateEntry(id: string, input: UpdateCmsEntryInput): Promise<CmsEntrySnapshot> {
    return this.cmsEntryService.update(id, input);
  }

  async publishEntry(id: string, updatedByUserId: string): Promise<CmsEntrySnapshot> {
    return this.cmsEntryService.publish(id, updatedByUserId);
  }

  async archiveEntry(id: string, updatedByUserId: string): Promise<CmsEntrySnapshot> {
    return this.cmsEntryService.archive(id, updatedByUserId);
  }

  async findPublicList(
    filter: PublicCmsListFilter,
    now?: Date,
  ): Promise<CmsPaginatedResult<CmsEntrySnapshot>> {
    return this.cmsEntryService.findPublicList(filter, now);
  }

  async findPublicBySlug(
    slug: string,
    options: {
      readonly parishId?: string;
      readonly allowedParishIds: readonly string[];
      readonly now?: Date;
    },
  ): Promise<CmsEntrySnapshot | null> {
    return this.cmsEntryService.findPublicBySlug(slug, options);
  }

  async findAdminList(
    filter: AdminCmsListFilter,
  ): Promise<CmsPaginatedResult<CmsEntrySnapshot>> {
    return this.cmsEntryService.findAdminList(filter);
  }

  async getAdminById(
    id: string,
    actor: { readonly isSuperAdmin: boolean; readonly adminParishIds: readonly string[] },
  ): Promise<CmsEntrySnapshot> {
    return this.cmsEntryService.getAdminById(id, actor);
  }

  async publishDueEntries(now?: Date): Promise<CmsScheduledPublishResult> {
    return this.cmsEntryService.publishDueEntries(now);
  }
}
