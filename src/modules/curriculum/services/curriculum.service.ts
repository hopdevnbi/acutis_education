import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { CatechismLevelStatus } from '../../academic-structure/enums/catechism-level-status.enum';
import { CatechismLevelService } from '../../academic-structure/services/catechism-level.service';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { ParishService } from '../../parish/services/parish.service';
import { CurriculumVersionEntity } from '../entities/curriculum-version.entity';
import { CurriculumEntity } from '../entities/curriculum.entity';
import { CurriculumStatus } from '../enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';
import {
  CurriculumCatechismLevelInactiveError,
  CurriculumCodeAlreadyExistsError,
  CurriculumDraftAlreadyExistsError,
  CurriculumInactiveError,
  CurriculumNotFoundError,
  CurriculumSourceLocaleImmutableError,
  CurriculumUpdateRequiresFieldsError,
  CurriculumVersionNotDraftError,
  CurriculumVersionNotFoundError,
  CurriculumVersionNumberConflictError,
  InvalidCurriculumIdError,
  InvalidCurriculumVersionIdError,
} from '../errors/curriculum.errors';
import type {
  CreateCurriculumInput,
  CreateCurriculumVersionInput,
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
  ListCurriculaInput,
  ListCurriculaResult,
  ListCurriculumVersionsInput,
  UpdateCurriculumInput,
  UpdateCurriculumVersionInput,
} from '../interfaces/curriculum.interface';
import { toCurriculumSnapshot, toCurriculumVersionSnapshot } from '../mappers/curriculum.mapper';
import { parseCurriculumCode } from '../utils/curriculum-code.util';
import { parseCurriculumDescription, parseCurriculumName } from '../utils/curriculum-name.util';
import { escapeLikePattern } from '../utils/curriculum-search.util';
import { parseSourceLocale } from '../utils/curriculum-source-locale.util';

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(CurriculumEntity)
    private readonly curriculumRepository: Repository<CurriculumEntity>,
    @InjectRepository(CurriculumVersionEntity)
    private readonly curriculumVersionRepository: Repository<CurriculumVersionEntity>,
    private readonly parishService: ParishService,
    private readonly catechismLevelService: CatechismLevelService,
    private readonly dataSource: DataSource,
  ) {}

  async createCurriculum(
    rawParishId: string,
    input: CreateCurriculumInput,
  ): Promise<CurriculumSnapshot> {
    const parishSnapshot = await this.parishService.assertParishActive(rawParishId);
    const catechismLevelSnapshot =
      await this.catechismLevelService.assertCatechismLevelBelongsToParish(
        input.catechismLevelId,
        parishSnapshot.id,
      );

    if (catechismLevelSnapshot.status !== CatechismLevelStatus.Active) {
      throw new CurriculumCatechismLevelInactiveError();
    }

    const curriculum = this.curriculumRepository.create({
      parishId: parishSnapshot.id,
      catechismLevelId: catechismLevelSnapshot.id,
      code: parseCurriculumCode(input.code),
      name: parseCurriculumName(input.name),
      description: parseCurriculumDescription(input.description),
      status: CurriculumStatus.Active,
      sourceLocale: parseSourceLocale(input.sourceLocale),
      currentPublishedVersionId: null,
    });

    try {
      const savedCurriculum = await this.curriculumRepository.save(curriculum);

      return toCurriculumSnapshot(savedCurriculum);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new CurriculumCodeAlreadyExistsError(curriculum.code);
      }

      throw error;
    }
  }

  async getCurriculumById(rawCurriculumId: string): Promise<CurriculumSnapshot> {
    const curriculum = await this.findCurriculumEntity(rawCurriculumId);

    return toCurriculumSnapshot(curriculum);
  }

  async listCurriculaByParish(
    rawParishId: string,
    input: ListCurriculaInput,
  ): Promise<ListCurriculaResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);

    const queryBuilder = this.curriculumRepository
      .createQueryBuilder('curriculum')
      .where('curriculum.parishId = :parishId', { parishId: parishSnapshot.id });

    this.applyCurriculumListFilters(queryBuilder, input);

    const sortColumn = this.resolveCurriculumSortColumn(input.sortBy);
    queryBuilder.orderBy(sortColumn, input.sort);

    const total = await queryBuilder.getCount();
    const entities = await queryBuilder
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .getMany();

    return {
      items: entities.map(toCurriculumSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async updateCurriculum(
    rawCurriculumId: string,
    input: UpdateCurriculumInput,
  ): Promise<CurriculumSnapshot> {
    if (
      input.code === undefined &&
      input.name === undefined &&
      input.description === undefined &&
      input.sourceLocale === undefined
    ) {
      throw new CurriculumUpdateRequiresFieldsError();
    }

    const curriculum = await this.findCurriculumEntity(rawCurriculumId);

    this.assertCurriculumActive(curriculum);

    if (input.sourceLocale !== undefined) {
      await this.assertSourceLocaleMutable(curriculum.id, curriculum.currentPublishedVersionId);
      curriculum.sourceLocale = parseSourceLocale(input.sourceLocale);
    }

    if (input.code !== undefined) {
      curriculum.code = parseCurriculumCode(input.code);
    }

    if (input.name !== undefined) {
      curriculum.name = parseCurriculumName(input.name);
    }

    if (input.description !== undefined) {
      curriculum.description = parseCurriculumDescription(input.description);
    }

    try {
      const savedCurriculum = await this.curriculumRepository.save(curriculum);

      return toCurriculumSnapshot(savedCurriculum);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new CurriculumCodeAlreadyExistsError(curriculum.code);
      }

      throw error;
    }
  }

  async updateCurriculumStatus(
    rawCurriculumId: string,
    status: CurriculumStatus,
  ): Promise<CurriculumSnapshot> {
    const curriculum = await this.findCurriculumEntity(rawCurriculumId);
    curriculum.status = status;

    const savedCurriculum = await this.curriculumRepository.save(curriculum);

    return toCurriculumSnapshot(savedCurriculum);
  }

  async createDraftVersion(
    rawCurriculumId: string,
    input: CreateCurriculumVersionInput,
  ): Promise<CurriculumVersionSnapshot> {
    return this.dataSource.transaction(async (entityManager) => {
      const curriculum = await entityManager.findOne(CurriculumEntity, {
        where: { id: this.parseCurriculumId(rawCurriculumId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (curriculum === null) {
        throw new CurriculumNotFoundError();
      }

      this.assertCurriculumActive(curriculum);

      const existingDraft = await entityManager.findOne(CurriculumVersionEntity, {
        where: {
          curriculumId: curriculum.id,
          status: CurriculumVersionStatus.Draft,
        },
      });

      if (existingDraft !== null) {
        throw new CurriculumDraftAlreadyExistsError();
      }

      const maxVersionNumber = await entityManager
        .createQueryBuilder(CurriculumVersionEntity, 'version')
        .select('MAX(version.versionNumber)', 'maxVersionNumber')
        .where('version.curriculumId = :curriculumId', { curriculumId: curriculum.id })
        .getRawOne<{ maxVersionNumber: number | null }>();

      const nextVersionNumber = (maxVersionNumber?.maxVersionNumber ?? 0) + 1;
      const label =
        input.label === undefined || input.label === null ? null : input.label.trim() || null;

      const version = entityManager.create(CurriculumVersionEntity, {
        curriculumId: curriculum.id,
        versionNumber: nextVersionNumber,
        status: CurriculumVersionStatus.Draft,
        label,
        publishedAt: null,
        publishedByUserId: null,
        createdByUserId: normalizeUuid(input.createdByUserId),
      });

      try {
        const savedVersion = await entityManager.save(CurriculumVersionEntity, version);

        return toCurriculumVersionSnapshot(savedVersion);
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error)) {
          throw this.mapVersionUniqueConstraintError(error);
        }

        throw error;
      }
    });
  }

  async listVersionsByCurriculum(
    rawCurriculumId: string,
    input: ListCurriculumVersionsInput,
  ): Promise<CurriculumVersionSnapshot[]> {
    const curriculumId = this.parseCurriculumId(rawCurriculumId);
    await this.findCurriculumEntity(curriculumId);

    const queryBuilder = this.curriculumVersionRepository
      .createQueryBuilder('version')
      .where('version.curriculumId = :curriculumId', { curriculumId });

    if (input.status !== undefined) {
      queryBuilder.andWhere('version.status = :status', { status: input.status });
    }

    const versions = await queryBuilder
      .orderBy('version.versionNumber', 'DESC')
      .addOrderBy('version.createdAt', 'DESC')
      .getMany();

    return versions.map(toCurriculumVersionSnapshot);
  }

  async getVersionById(rawVersionId: string): Promise<CurriculumVersionSnapshot> {
    const version = await this.findVersionEntity(rawVersionId);

    return toCurriculumVersionSnapshot(version);
  }

  async updateDraftVersionLabel(
    rawVersionId: string,
    input: UpdateCurriculumVersionInput,
  ): Promise<CurriculumVersionSnapshot> {
    const version = await this.findVersionEntity(rawVersionId);

    if (version.status !== CurriculumVersionStatus.Draft) {
      throw new CurriculumVersionNotDraftError();
    }

    const curriculum = await this.findCurriculumEntity(version.curriculumId);
    this.assertCurriculumActive(curriculum);

    if (input.label !== undefined) {
      version.label = input.label === null ? null : input.label.trim() || null;
    }

    const savedVersion = await this.curriculumVersionRepository.save(version);

    return toCurriculumVersionSnapshot(savedVersion);
  }

  async getCurriculumParishId(rawCurriculumId: string): Promise<string> {
    const curriculum = await this.findCurriculumEntity(rawCurriculumId);

    return normalizeUuid(curriculum.parishId);
  }

  async getVersionCurriculumParishId(rawVersionId: string): Promise<string> {
    const version = await this.findVersionEntity(rawVersionId);
    const curriculum = await this.findCurriculumEntity(version.curriculumId);

    return normalizeUuid(curriculum.parishId);
  }

  private applyCurriculumListFilters(
    queryBuilder: SelectQueryBuilder<CurriculumEntity>,
    input: ListCurriculaInput,
  ): void {
    if (input.catechismLevelId !== undefined) {
      queryBuilder.andWhere('curriculum.catechismLevelId = :catechismLevelId', {
        catechismLevelId: normalizeUuid(input.catechismLevelId),
      });
    }

    if (input.status !== undefined) {
      queryBuilder.andWhere('curriculum.status = :status', { status: input.status });
    }

    if (input.sourceLocale !== undefined) {
      queryBuilder.andWhere('curriculum.sourceLocale = :sourceLocale', {
        sourceLocale: parseSourceLocale(input.sourceLocale),
      });
    }

    if (input.search !== undefined && input.search.trim().length > 0) {
      const searchPattern = `%${escapeLikePattern(input.search.trim())}%`;
      queryBuilder.andWhere(
        new Brackets((expressionBuilder) => {
          expressionBuilder
            .where("curriculum.code LIKE :searchPattern ESCAPE '\\'")
            .orWhere("curriculum.name LIKE :searchPattern ESCAPE '\\'");
        }),
        { searchPattern },
      );
    }
  }

  private resolveCurriculumSortColumn(
    sortBy: ListCurriculaInput['sortBy'],
  ): 'curriculum.name' | 'curriculum.code' | 'curriculum.status' | 'curriculum.createdAt' {
    switch (sortBy) {
      case 'code':
        return 'curriculum.code';
      case 'status':
        return 'curriculum.status';
      case 'createdAt':
        return 'curriculum.createdAt';
      case 'name':
      default:
        return 'curriculum.name';
    }
  }

  private async assertSourceLocaleMutable(
    curriculumId: string,
    currentPublishedVersionId: string | null,
  ): Promise<void> {
    if (currentPublishedVersionId !== null) {
      throw new CurriculumSourceLocaleImmutableError();
    }

    const publishedOrArchivedCount = await this.curriculumVersionRepository.count({
      where: [
        { curriculumId, status: CurriculumVersionStatus.Published },
        { curriculumId, status: CurriculumVersionStatus.Archived },
      ],
    });

    if (publishedOrArchivedCount > 0) {
      throw new CurriculumSourceLocaleImmutableError();
    }
  }

  private assertCurriculumActive(curriculum: CurriculumEntity): void {
    if (curriculum.status !== CurriculumStatus.Active) {
      throw new CurriculumInactiveError();
    }
  }

  private mapVersionUniqueConstraintError(error: unknown): Error {
    if (!(error instanceof QueryFailedError)) {
      return new CurriculumVersionNumberConflictError();
    }

    const message = String(error.message);

    if (message.includes('UQ_curriculum_versions_curriculum_id_draft')) {
      return new CurriculumDraftAlreadyExistsError();
    }

    return new CurriculumVersionNumberConflictError();
  }

  private async findCurriculumEntity(rawCurriculumId: string): Promise<CurriculumEntity> {
    const curriculumId = this.parseCurriculumId(rawCurriculumId);
    const curriculum = await this.curriculumRepository.findOne({ where: { id: curriculumId } });

    if (curriculum === null) {
      throw new CurriculumNotFoundError();
    }

    return curriculum;
  }

  private async findVersionEntity(rawVersionId: string): Promise<CurriculumVersionEntity> {
    const versionId = this.parseVersionId(rawVersionId);
    const version = await this.curriculumVersionRepository.findOne({ where: { id: versionId } });

    if (version === null) {
      throw new CurriculumVersionNotFoundError();
    }

    return version;
  }

  private parseCurriculumId(rawCurriculumId: string): string {
    if (!isUuidV4(rawCurriculumId)) {
      throw new InvalidCurriculumIdError();
    }

    return normalizeUuid(rawCurriculumId);
  }

  private parseVersionId(rawVersionId: string): string {
    if (!isUuidV4(rawVersionId)) {
      throw new InvalidCurriculumVersionIdError();
    }

    return normalizeUuid(rawVersionId);
  }
}
