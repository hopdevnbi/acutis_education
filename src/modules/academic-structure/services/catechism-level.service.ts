import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ParishService } from '../../parish/services/parish.service';
import { CatechismLevelEntity } from '../entities/catechism-level.entity';
import { CatechismLevelStatus } from '../enums/catechism-level-status.enum';
import {
  CatechismLevelCodeAlreadyExistsError,
  CatechismLevelNotFoundError,
  InvalidCatechismLevelIdError,
} from '../errors/catechism-level.errors';
import type {
  CatechismLevelSnapshot,
  CreateCatechismLevelInput,
  ListCatechismLevelsInput,
  ListCatechismLevelsResult,
  UpdateCatechismLevelInput,
} from '../interfaces/catechism-level.interface';
import { toCatechismLevelSnapshot } from '../mappers/catechism-level.mapper';
import { escapeLikePattern } from '../utils/academic-structure-search.util';
import { parseCatechismLevelCode } from '../utils/catechism-level-code.util';
import { parseCatechismLevelName } from '../utils/catechism-level-name.util';
import { parseCatechismLevelSortOrder } from '../utils/catechism-level-sort-order.util';
import { isUniqueConstraintViolation } from '../utils/unique-constraint.util';

@Injectable()
export class CatechismLevelService {
  constructor(
    @InjectRepository(CatechismLevelEntity)
    private readonly catechismLevelRepository: Repository<CatechismLevelEntity>,
    private readonly parishService: ParishService,
  ) {}

  async createCatechismLevel(
    rawParishId: string,
    input: CreateCatechismLevelInput,
  ): Promise<CatechismLevelSnapshot> {
    const parishSnapshot = await this.parishService.assertParishActive(rawParishId);
    const code = parseCatechismLevelCode(input.code);
    const name = parseCatechismLevelName(input.name);
    const sortOrder = parseCatechismLevelSortOrder(input.sortOrder);

    const catechismLevel = this.catechismLevelRepository.create({
      parishId: parishSnapshot.id,
      code,
      name,
      sortOrder,
      status: CatechismLevelStatus.Active,
    });

    try {
      const savedCatechismLevel = await this.catechismLevelRepository.save(catechismLevel);

      return toCatechismLevelSnapshot(savedCatechismLevel);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new CatechismLevelCodeAlreadyExistsError(code);
      }

      throw error;
    }
  }

  async getCatechismLevelById(rawCatechismLevelId: string): Promise<CatechismLevelSnapshot> {
    const catechismLevel = await this.findCatechismLevelEntity(rawCatechismLevelId);

    return toCatechismLevelSnapshot(catechismLevel);
  }

  async listCatechismLevelsByParish(
    rawParishId: string,
    input: ListCatechismLevelsInput,
  ): Promise<ListCatechismLevelsResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);

    return this.listCatechismLevels(parishSnapshot.id, input);
  }

  async updateCatechismLevel(
    rawCatechismLevelId: string,
    input: UpdateCatechismLevelInput,
  ): Promise<CatechismLevelSnapshot> {
    const catechismLevel = await this.findCatechismLevelEntity(rawCatechismLevelId);

    await this.parishService.assertParishActive(catechismLevel.parishId);

    if (input.code !== undefined) {
      catechismLevel.code = parseCatechismLevelCode(input.code);
    }

    if (input.name !== undefined) {
      catechismLevel.name = parseCatechismLevelName(input.name);
    }

    if (input.sortOrder !== undefined) {
      catechismLevel.sortOrder = parseCatechismLevelSortOrder(input.sortOrder);
    }

    try {
      const savedCatechismLevel = await this.catechismLevelRepository.save(catechismLevel);

      return toCatechismLevelSnapshot(savedCatechismLevel);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new CatechismLevelCodeAlreadyExistsError(catechismLevel.code);
      }

      throw error;
    }
  }

  async updateCatechismLevelStatus(
    rawCatechismLevelId: string,
    status: CatechismLevelStatus,
  ): Promise<CatechismLevelSnapshot> {
    const catechismLevel = await this.findCatechismLevelEntity(rawCatechismLevelId);

    if (status === CatechismLevelStatus.Active) {
      await this.parishService.assertParishActive(catechismLevel.parishId);
    }

    catechismLevel.status = status;
    const savedCatechismLevel = await this.catechismLevelRepository.save(catechismLevel);

    return toCatechismLevelSnapshot(savedCatechismLevel);
  }

  private async listCatechismLevels(
    parishId: string,
    input: ListCatechismLevelsInput,
  ): Promise<ListCatechismLevelsResult> {
    const countQueryBuilder = this.catechismLevelRepository.createQueryBuilder('catechismLevel');
    countQueryBuilder.andWhere('catechismLevel.parishId = :parishId', { parishId });
    this.applyListFilters(countQueryBuilder, input);
    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.catechismLevelRepository.createQueryBuilder('catechismLevel');
    dataQueryBuilder.andWhere('catechismLevel.parishId = :parishId', { parishId });
    this.applyListFilters(dataQueryBuilder, input);
    dataQueryBuilder.orderBy(`catechismLevel.${input.sortBy}`, input.sort);
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const catechismLevels = await dataQueryBuilder.getMany();

    return {
      items: catechismLevels.map(toCatechismLevelSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  private async findCatechismLevelEntity(
    rawCatechismLevelId: string,
  ): Promise<CatechismLevelEntity> {
    const catechismLevelId = this.parseCatechismLevelId(rawCatechismLevelId);
    const catechismLevel = await this.catechismLevelRepository.findOne({
      where: { id: catechismLevelId },
    });

    if (catechismLevel === null) {
      throw new CatechismLevelNotFoundError();
    }

    return catechismLevel;
  }

  private parseCatechismLevelId(rawCatechismLevelId: string): string {
    if (!isUuidV4(rawCatechismLevelId)) {
      throw new InvalidCatechismLevelIdError();
    }

    return normalizeUuid(rawCatechismLevelId);
  }

  private applyListFilters(
    queryBuilder: SelectQueryBuilder<CatechismLevelEntity>,
    input: ListCatechismLevelsInput,
  ): void {
    if (input.status !== undefined) {
      queryBuilder.andWhere('catechismLevel.status = :status', { status: input.status });
    }

    if (input.search !== undefined) {
      const normalizedSearch = input.search.trim();

      if (normalizedSearch.length > 0) {
        const escapedSearch = escapeLikePattern(normalizedSearch.toLowerCase());

        queryBuilder.andWhere(
          new Brackets((subQueryBuilder) => {
            subQueryBuilder
              .where("LOWER(catechismLevel.name) LIKE :search ESCAPE '\\'", {
                search: `%${escapedSearch}%`,
              })
              .orWhere("LOWER(catechismLevel.code) LIKE :search ESCAPE '\\'", {
                search: `%${escapedSearch}%`,
              });
          }),
        );
      }
    }
  }
}
