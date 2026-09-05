import { Injectable } from '@nestjs/common';
import type {
  CmsEntrySnapshot,
  CreateCmsEntryInput,
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

  async findEntryByScopeAndSlug(
    scopeKey: string,
    slug: string,
  ): Promise<CmsEntrySnapshot | null> {
    return this.cmsEntryService.findByScopeAndSlug(scopeKey, slug);
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
}
