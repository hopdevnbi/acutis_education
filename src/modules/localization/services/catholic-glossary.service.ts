import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { parseLocale } from '../../../common/locale';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { CatholicGlossaryTermEntity } from '../entities/catholic-glossary-term.entity';
import { CatholicGlossaryVersionEntity } from '../entities/catholic-glossary-version.entity';
import { CatholicGlossaryVersionStatus } from '../enums/catholic-glossary-version-status.enum';
import {
  CatholicGlossaryLocalePairError,
  CatholicGlossaryTermConflictError,
  CatholicGlossaryTermNotFoundError,
  CatholicGlossaryVersionImmutableError,
  CatholicGlossaryVersionNotFoundError,
} from '../errors/localization.errors';
import type {
  CatholicGlossaryTermSnapshot,
  CatholicGlossaryVersionSnapshot,
} from '../interfaces/localization.interface';
import {
  toCatholicGlossaryTermSnapshot,
  toCatholicGlossaryVersionSnapshot,
} from '../mappers/localization.mapper';
import { normalizeOptionalUuid } from '../utils/localization-validation.util';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class CatholicGlossaryService {
  constructor(
    @InjectRepository(CatholicGlossaryVersionEntity)
    private readonly glossaryVersionRepository: Repository<CatholicGlossaryVersionEntity>,
    @InjectRepository(CatholicGlossaryTermEntity)
    private readonly glossaryTermRepository: Repository<CatholicGlossaryTermEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async createDraft(input: {
    readonly sourceLocale: string;
    readonly targetLocale: string;
    readonly createdByUserId?: string | null;
  }): Promise<CatholicGlossaryVersionSnapshot> {
    const sourceLocale = this.parseLocalePair(input.sourceLocale, input.targetLocale).sourceLocale;
    const targetLocale = this.parseLocalePair(input.sourceLocale, input.targetLocale).targetLocale;

    const maxVersionRow = await this.glossaryVersionRepository
      .createQueryBuilder('version')
      .select('MAX(version.versionNumber)', 'maxVersionNumber')
      .where('version.sourceLocale = :sourceLocale', { sourceLocale })
      .andWhere('version.targetLocale = :targetLocale', { targetLocale })
      .getRawOne<{ maxVersionNumber: number | null }>();

    const version = this.glossaryVersionRepository.create({
      sourceLocale,
      targetLocale,
      versionNumber: (maxVersionRow?.maxVersionNumber ?? 0) + 1,
      status: CatholicGlossaryVersionStatus.Draft,
      providerGlossaryId: null,
      createdByUserId: normalizeOptionalUuid(input.createdByUserId),
      publishedByUserId: null,
      publishedAt: null,
    });

    const savedVersion = await this.glossaryVersionRepository.save(version);

    return toCatholicGlossaryVersionSnapshot(savedVersion);
  }

  async addTerm(input: {
    readonly glossaryVersionId: string;
    readonly sourceTerm: string;
    readonly targetTerm: string;
    readonly notes?: string | null;
    readonly caseSensitive?: boolean;
  }): Promise<CatholicGlossaryTermSnapshot> {
    const glossaryVersion = await this.findMutableVersion(input.glossaryVersionId);
    const sourceTerm = this.normalizeTerm(input.sourceTerm);
    const targetTerm = this.normalizeTerm(input.targetTerm);

    const term = this.glossaryTermRepository.create({
      glossaryVersionId: glossaryVersion.id,
      sourceTerm,
      targetTerm,
      notes: input.notes?.trim() ?? null,
      caseSensitive: input.caseSensitive ?? false,
    });

    try {
      const savedTerm = await this.glossaryTermRepository.save(term);

      return toCatholicGlossaryTermSnapshot(savedTerm);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new CatholicGlossaryTermConflictError();
      }

      throw error;
    }
  }

  async updateTerm(input: {
    readonly termId: string;
    readonly sourceTerm?: string;
    readonly targetTerm?: string;
    readonly notes?: string | null;
    readonly caseSensitive?: boolean;
  }): Promise<CatholicGlossaryTermSnapshot> {
    const term = await this.findTermById(input.termId);
    await this.findMutableVersion(term.glossaryVersionId);

    if (input.sourceTerm !== undefined) {
      term.sourceTerm = this.normalizeTerm(input.sourceTerm);
    }

    if (input.targetTerm !== undefined) {
      term.targetTerm = this.normalizeTerm(input.targetTerm);
    }

    if (input.notes !== undefined) {
      term.notes = input.notes?.trim() ?? null;
    }

    if (input.caseSensitive !== undefined) {
      term.caseSensitive = input.caseSensitive;
    }

    try {
      const savedTerm = await this.glossaryTermRepository.save(term);

      return toCatholicGlossaryTermSnapshot(savedTerm);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new CatholicGlossaryTermConflictError();
      }

      throw error;
    }
  }

  async deleteTerm(termId: string): Promise<void> {
    const term = await this.findTermById(termId);
    await this.findMutableVersion(term.glossaryVersionId);
    await this.glossaryTermRepository.delete({ id: term.id });
  }

  async publish(input: {
    readonly glossaryVersionId: string;
    readonly publishedByUserId?: string | null;
    readonly providerGlossaryId?: string | null;
  }): Promise<CatholicGlossaryVersionSnapshot> {
    return this.dataSource.transaction(async (entityManager) => {
      const versionRepository = entityManager.getRepository(CatholicGlossaryVersionEntity);
      const version = await this.findMutableVersion(input.glossaryVersionId, versionRepository);
      const publishedAt = new Date();

      const previouslyPublished = await versionRepository.find({
        where: {
          sourceLocale: version.sourceLocale,
          targetLocale: version.targetLocale,
          status: CatholicGlossaryVersionStatus.Published,
        },
      });

      for (const publishedVersion of previouslyPublished) {
        publishedVersion.status = CatholicGlossaryVersionStatus.Archived;
        await versionRepository.save(publishedVersion);
      }

      version.status = CatholicGlossaryVersionStatus.Published;
      version.publishedByUserId = normalizeOptionalUuid(input.publishedByUserId);
      version.publishedAt = publishedAt;
      version.providerGlossaryId = input.providerGlossaryId?.trim() ?? null;

      const savedVersion = await versionRepository.save(version);

      return toCatholicGlossaryVersionSnapshot(savedVersion);
    });
  }

  async getPublishedForPair(input: {
    readonly sourceLocale: string;
    readonly targetLocale: string;
  }): Promise<CatholicGlossaryVersionSnapshot | null> {
    const { sourceLocale, targetLocale } = this.parseLocalePair(
      input.sourceLocale,
      input.targetLocale,
    );

    const version = await this.glossaryVersionRepository.findOne({
      where: {
        sourceLocale,
        targetLocale,
        status: CatholicGlossaryVersionStatus.Published,
      },
      order: { versionNumber: 'DESC' },
    });

    return version === null ? null : toCatholicGlossaryVersionSnapshot(version);
  }

  async listTermsForVersion(glossaryVersionId: string): Promise<CatholicGlossaryTermSnapshot[]> {
    const normalizedVersionId = this.parseGlossaryVersionId(glossaryVersionId);
    const terms = await this.glossaryTermRepository.find({
      where: { glossaryVersionId: normalizedVersionId },
      order: { sourceTerm: 'ASC' },
    });

    return terms.map((term) => toCatholicGlossaryTermSnapshot(term));
  }

  async clonePublishedToDraft(input: {
    readonly sourceLocale: string;
    readonly targetLocale: string;
    readonly createdByUserId?: string | null;
  }): Promise<CatholicGlossaryVersionSnapshot> {
    const published = await this.getPublishedForPair(input);

    if (published === null) {
      return this.createDraft(input);
    }

    const draft = await this.createDraft(input);
    const terms = await this.listTermsForVersion(published.id);

    for (const term of terms) {
      await this.addTerm({
        glossaryVersionId: draft.id,
        sourceTerm: term.sourceTerm,
        targetTerm: term.targetTerm,
        notes: term.notes,
        caseSensitive: term.caseSensitive,
      });
    }

    return draft;
  }

  private parseLocalePair(
    rawSourceLocale: string,
    rawTargetLocale: string,
  ): { sourceLocale: string; targetLocale: string } {
    const sourceLocale = parseLocale(rawSourceLocale);
    const targetLocale = parseLocale(rawTargetLocale);

    if (sourceLocale === targetLocale) {
      throw new CatholicGlossaryLocalePairError();
    }

    return { sourceLocale, targetLocale };
  }

  private normalizeTerm(value: string): string {
    const trimmed = value.trim();

    if (trimmed.length === 0 || trimmed.length > 512) {
      throw new CatholicGlossaryLocalePairError();
    }

    return trimmed;
  }

  private async findMutableVersion(
    glossaryVersionId: string,
    repository: Repository<CatholicGlossaryVersionEntity> = this.glossaryVersionRepository,
  ): Promise<CatholicGlossaryVersionEntity> {
    const version = await this.findVersionById(glossaryVersionId, repository);

    if (version.status !== CatholicGlossaryVersionStatus.Draft) {
      throw new CatholicGlossaryVersionImmutableError();
    }

    return version;
  }

  private async findVersionById(
    glossaryVersionId: string,
    repository: Repository<CatholicGlossaryVersionEntity> = this.glossaryVersionRepository,
  ): Promise<CatholicGlossaryVersionEntity> {
    const normalizedVersionId = this.parseGlossaryVersionId(glossaryVersionId);
    const version = await repository.findOne({ where: { id: normalizedVersionId } });

    if (version === null) {
      throw new CatholicGlossaryVersionNotFoundError();
    }

    return version;
  }

  private async findTermById(termId: string): Promise<CatholicGlossaryTermEntity> {
    if (!isUuidV4(termId)) {
      throw new CatholicGlossaryTermNotFoundError();
    }

    const term = await this.glossaryTermRepository.findOne({
      where: { id: normalizeUuid(termId) },
    });

    if (term === null) {
      throw new CatholicGlossaryTermNotFoundError();
    }

    return term;
  }

  private parseGlossaryVersionId(rawGlossaryVersionId: string): string {
    if (!isUuidV4(rawGlossaryVersionId)) {
      throw new CatholicGlossaryVersionNotFoundError();
    }

    return normalizeUuid(rawGlossaryVersionId);
  }
}
