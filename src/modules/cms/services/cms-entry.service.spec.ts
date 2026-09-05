import type { Repository } from 'typeorm';
import { CmsEntryEntity } from '../entities/cms-entry.entity';
import { CmsEntryStatus, CmsEntryType, CmsScopeType } from '../enums/cms.enums';
import {
  CmsEntryNotEditableError,
  CmsEntryNotFoundError,
  CmsSlugConflictError,
  InvalidCmsLifecycleTransitionError,
  InvalidCmsScheduleError,
} from '../errors/cms.errors';
import { CmsEntryService } from './cms-entry.service';

describe('CmsEntryService', () => {
  let service: CmsEntryService;
  let repository: jest.Mocked<Repository<CmsEntryEntity>>;

  const authorUserId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    repository = {
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: '22222222-2222-4222-8222-222222222222',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest.fn().mockImplementation(async (entity) => entity),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<CmsEntryEntity>>;

    service = new CmsEntryService(repository);
  });

  describe('create', () => {
    it('creates a DRAFT entry with derived scopeKey when scheduledFor is not provided', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.create({
        type: CmsEntryType.Article,
        scopeType: CmsScopeType.Global,
        slug: 'welcome-parishioners',
        title: 'Welcome Parishioners',
        body: 'Welcome body content',
        authorUserId,
      });

      expect(result.status).toBe(CmsEntryStatus.Draft);
      expect(result.scopeKey).toBe('GLOBAL');
      expect(result.slug).toBe('welcome-parishioners');
      expect(repository.save).toHaveBeenCalled();
    });

    it('creates a SCHEDULED entry when future scheduledFor is specified', async () => {
      repository.findOne.mockResolvedValue(null);
      const futureDate = new Date(Date.now() + 86400000);

      const result = await service.create({
        type: CmsEntryType.News,
        scopeType: CmsScopeType.Global,
        slug: 'upcoming-synod',
        title: 'Upcoming Synod',
        body: 'Synod news',
        scheduledFor: futureDate,
        authorUserId,
      });

      expect(result.status).toBe(CmsEntryStatus.Scheduled);
      expect(result.scheduledFor).toEqual(futureDate);
    });

    it('throws CmsSlugConflictError when duplicate slug exists in same scope', async () => {
      repository.findOne.mockResolvedValue({
        id: 'existing-id',
        slug: 'welcome-parishioners',
        scopeKey: 'GLOBAL',
      } as CmsEntryEntity);

      await expect(
        service.create({
          type: CmsEntryType.Article,
          scopeType: CmsScopeType.Global,
          slug: 'welcome-parishioners',
          title: 'Welcome Parishioners Again',
          body: 'Duplicate body',
          authorUserId,
        }),
      ).rejects.toThrow(CmsSlugConflictError);
    });

    it('throws InvalidCmsScheduleError if scheduledFor is in the past', async () => {
      repository.findOne.mockResolvedValue(null);
      const pastDate = new Date(Date.now() - 3600000);

      await expect(
        service.create({
          type: CmsEntryType.News,
          scopeType: CmsScopeType.Global,
          slug: 'past-news',
          title: 'Past News',
          body: 'Content',
          scheduledFor: pastDate,
          authorUserId,
        }),
      ).rejects.toThrow(InvalidCmsScheduleError);
    });
  });

  describe('update', () => {
    it('throws CmsEntryNotFoundError when entry does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', {
          title: 'New Title',
          updatedByUserId: authorUserId,
        }),
      ).rejects.toThrow(CmsEntryNotFoundError);
    });

    it('throws CmsEntryNotEditableError when attempting to change slug on PUBLISHED entry', async () => {
      repository.findOne.mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Published,
        slug: 'old-slug',
        scopeType: CmsScopeType.Global,
        scopeKey: 'GLOBAL',
      } as CmsEntryEntity);

      await expect(
        service.update('22222222-2222-4222-8222-222222222222', {
          slug: 'new-slug',
          updatedByUserId: authorUserId,
        }),
      ).rejects.toThrow(CmsEntryNotEditableError);
    });

    it('allows updating title and summary on PUBLISHED entry', async () => {
      const entity = {
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Published,
        slug: 'published-article',
        scopeType: CmsScopeType.Global,
        scopeKey: 'GLOBAL',
        title: 'Original Title',
        summary: null,
        body: 'Body',
        locale: 'vi-VN',
        isFeatured: false,
        publishedAt: new Date(),
        expiresAt: null,
        createdByUserId: authorUserId,
        updatedByUserId: authorUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CmsEntryEntity;

      repository.findOne.mockResolvedValue(entity);

      const result = await service.update('22222222-2222-4222-8222-222222222222', {
        title: 'Updated Title',
        summary: 'Updated summary',
        updatedByUserId: authorUserId,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.summary).toBe('Updated summary');
    });

    it('reverts SCHEDULED entry to DRAFT when scheduledFor is explicitly set to null', async () => {
      const entity = {
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Scheduled,
        slug: 'scheduled-article',
        scopeType: CmsScopeType.Global,
        scopeKey: 'GLOBAL',
        title: 'Scheduled Title',
        scheduledFor: new Date(Date.now() + 86400000),
        createdByUserId: authorUserId,
        updatedByUserId: authorUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CmsEntryEntity;

      repository.findOne.mockResolvedValue(entity);

      const result = await service.update('22222222-2222-4222-8222-222222222222', {
        scheduledFor: null,
        updatedByUserId: authorUserId,
      });

      expect(result.status).toBe(CmsEntryStatus.Draft);
      expect(result.scheduledFor).toBeNull();
    });
  });

  describe('publish', () => {
    it('transitions DRAFT entry to PUBLISHED and sets publishedAt', async () => {
      const entity = {
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Draft,
        slug: 'draft-article',
        publishedAt: null,
        createdByUserId: authorUserId,
        updatedByUserId: authorUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CmsEntryEntity;

      repository.findOne.mockResolvedValue(entity);

      const result = await service.publish('22222222-2222-4222-8222-222222222222', authorUserId);

      expect(result.status).toBe(CmsEntryStatus.Published);
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it('throws InvalidCmsLifecycleTransitionError when entry is already PUBLISHED', async () => {
      repository.findOne.mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Published,
      } as CmsEntryEntity);

      await expect(
        service.publish('22222222-2222-4222-8222-222222222222', authorUserId),
      ).rejects.toThrow(InvalidCmsLifecycleTransitionError);
    });

    it('throws InvalidCmsLifecycleTransitionError when entry is ARCHIVED', async () => {
      repository.findOne.mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Archived,
      } as CmsEntryEntity);

      await expect(
        service.publish('22222222-2222-4222-8222-222222222222', authorUserId),
      ).rejects.toThrow(InvalidCmsLifecycleTransitionError);
    });
  });

  describe('archive', () => {
    it('transitions PUBLISHED entry to ARCHIVED', async () => {
      const entity = {
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Published,
        createdByUserId: authorUserId,
        updatedByUserId: authorUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CmsEntryEntity;

      repository.findOne.mockResolvedValue(entity);

      const result = await service.archive('22222222-2222-4222-8222-222222222222', authorUserId);

      expect(result.status).toBe(CmsEntryStatus.Archived);
    });

    it('throws InvalidCmsLifecycleTransitionError when entry is already ARCHIVED', async () => {
      repository.findOne.mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        status: CmsEntryStatus.Archived,
      } as CmsEntryEntity);

      await expect(
        service.archive('22222222-2222-4222-8222-222222222222', authorUserId),
      ).rejects.toThrow(InvalidCmsLifecycleTransitionError);
    });
  });

  describe('publishDueEntries', () => {
    it('publishes due scheduled entries', async () => {
      const now = new Date();
      const pastScheduledDate = new Date(now.getTime() - 60000);

      const entry = {
        id: 'entry-1',
        status: CmsEntryStatus.Scheduled,
        scheduledFor: pastScheduledDate,
        publishedAt: null,
      } as CmsEntryEntity;

      repository.find.mockResolvedValue([entry]);
      repository.save.mockResolvedValue([entry] as unknown as CmsEntryEntity);

      const result = await service.publishDueEntries(now);

      expect(result.processedCount).toBe(1);
      expect(result.publishedEntryIds).toContain('entry-1');
      expect(entry.status).toBe(CmsEntryStatus.Published);
    });

    it('returns empty result when no scheduled entries are due', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.publishDueEntries();

      expect(result.processedCount).toBe(0);
      expect(result.publishedEntryIds).toHaveLength(0);
    });
  });
});
