import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { parseLocale } from '../../../common/locale';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ParishEntity } from '../entities/parish.entity';
import { ParishStatus } from '../enums/parish-status.enum';
import {
  InvalidParishDefaultLocaleError,
  InvalidParishIdError,
  ParishCodeAlreadyExistsError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../errors/parish.errors';
import type { CreateParishInput } from '../interfaces/create-parish-input.interface';
import type { ListParishesInput } from '../interfaces/list-parishes-input.interface';
import type { ListParishesResult } from '../interfaces/list-parishes-result.interface';
import type { ParishSnapshot } from '../interfaces/parish-snapshot.interface';
import type { UpdateParishInput } from '../interfaces/update-parish-input.interface';
import { toParishSnapshot } from '../mappers/parish.mapper';
import { parseParishCode } from '../utils/parish-code.util';
import { parseParishName } from '../utils/parish-name.util';
import { escapeLikePattern } from '../utils/parish-search.util';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class ParishService {
  constructor(
    @InjectRepository(ParishEntity)
    private readonly parishRepository: Repository<ParishEntity>,
  ) {}

  async createParish(input: CreateParishInput): Promise<ParishSnapshot> {
    const code = parseParishCode(input.code);
    const name = parseParishName(input.name);

    const parish = this.parishRepository.create({
      code,
      name,
      status: ParishStatus.Active,
      defaultLocale: null,
    });

    try {
      const savedParish = await this.parishRepository.save(parish);

      return toParishSnapshot(savedParish);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new ParishCodeAlreadyExistsError(code);
      }

      throw error;
    }
  }

  async getParishById(rawParishId: string): Promise<ParishSnapshot> {
    const parishId = this.parseParishId(rawParishId);
    const parish = await this.parishRepository.findOne({
      where: { id: parishId },
    });

    if (parish === null) {
      throw new ParishNotFoundError();
    }

    return toParishSnapshot(parish);
  }

  async findParishSnapshotById(rawParishId: string): Promise<ParishSnapshot | null> {
    if (!isUuidV4(rawParishId)) {
      return null;
    }

    const parish = await this.parishRepository.findOne({
      where: { id: normalizeUuid(rawParishId) },
    });

    if (parish === null) {
      return null;
    }

    return toParishSnapshot(parish);
  }

  async listParishes(input: ListParishesInput): Promise<ListParishesResult> {
    const countQueryBuilder = this.parishRepository.createQueryBuilder('parish');
    this.applyListFilters(countQueryBuilder, input);
    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.parishRepository.createQueryBuilder('parish');
    this.applyListFilters(dataQueryBuilder, input);
    dataQueryBuilder.orderBy(`parish.${input.sortBy}`, input.sort);
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const parishes = await dataQueryBuilder.getMany();

    return {
      items: parishes.map(toParishSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async updateParish(rawParishId: string, input: UpdateParishInput): Promise<ParishSnapshot> {
    const parishId = this.parseParishId(rawParishId);
    const parish = await this.parishRepository.findOne({
      where: { id: parishId },
    });

    if (parish === null) {
      throw new ParishNotFoundError();
    }

    if (input.code !== undefined) {
      parish.code = parseParishCode(input.code);
    }

    if (input.name !== undefined) {
      parish.name = parseParishName(input.name);
    }

    if (input.defaultLocale !== undefined) {
      parish.defaultLocale = this.parseOptionalDefaultLocale(input.defaultLocale);
    }

    try {
      const savedParish = await this.parishRepository.save(parish);

      return toParishSnapshot(savedParish);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new ParishCodeAlreadyExistsError(parish.code);
      }

      throw error;
    }
  }

  async updateParishStatus(rawParishId: string, status: ParishStatus): Promise<ParishSnapshot> {
    const parishId = this.parseParishId(rawParishId);
    const parish = await this.parishRepository.findOne({
      where: { id: parishId },
    });

    if (parish === null) {
      throw new ParishNotFoundError();
    }

    parish.status = status;
    const savedParish = await this.parishRepository.save(parish);

    return toParishSnapshot(savedParish);
  }

  async assertParishActive(rawParishId: string): Promise<ParishSnapshot> {
    const snapshot = await this.getParishById(rawParishId);

    if (snapshot.status !== ParishStatus.Active) {
      throw new ParishInactiveError();
    }

    return snapshot;
  }

  private parseParishId(rawParishId: string): string {
    if (!isUuidV4(rawParishId)) {
      throw new InvalidParishIdError();
    }

    return normalizeUuid(rawParishId);
  }

  private parseOptionalDefaultLocale(defaultLocale: string | null): string | null {
    if (defaultLocale === null) {
      return null;
    }

    try {
      return parseLocale(defaultLocale);
    } catch {
      throw new InvalidParishDefaultLocaleError();
    }
  }

  private applyListFilters(
    queryBuilder: SelectQueryBuilder<ParishEntity>,
    input: ListParishesInput,
  ): void {
    if (input.status !== undefined) {
      queryBuilder.andWhere('parish.status = :status', { status: input.status });
    }

    if (input.search !== undefined) {
      const normalizedSearch = input.search.trim();

      if (normalizedSearch.length > 0) {
        const escapedSearch = escapeLikePattern(normalizedSearch.toLowerCase());

        queryBuilder.andWhere(
          new Brackets((subQueryBuilder) => {
            subQueryBuilder
              .where("parish.name LIKE :search ESCAPE '\\'", {
                search: `%${escapedSearch}%`,
              })
              .orWhere("parish.code LIKE :search ESCAPE '\\'", {
                search: `%${escapedSearch}%`,
              });
          }),
        );
      }
    }
  }
}
