import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ParishService } from '../../parish/services/parish.service';
import { AcademicYearEntity } from '../entities/academic-year.entity';
import { AcademicYearStatus } from '../enums/academic-year-status.enum';
import {
  AcademicYearAlreadyExistsError,
  AcademicYearClosedImmutableError,
  AcademicYearNotFoundError,
  ActiveAcademicYearAlreadyExistsError,
  InvalidAcademicYearIdError,
  InvalidAcademicYearStatusTransitionError,
} from '../errors/academic-year.errors';
import type {
  AcademicYearSnapshot,
  CreateAcademicYearInput,
  ListAcademicYearsInput,
  ListAcademicYearsResult,
  UpdateAcademicYearInput,
} from '../interfaces/academic-year.interface';
import { toAcademicYearSnapshot } from '../mappers/academic-year.mapper';
import { assertStartDateBeforeEndDate, parseIsoDateOnly } from '../utils/academic-year-date.util';
import { parseAcademicYearName } from '../utils/academic-year-name.util';
import { escapeLikePattern } from '../utils/academic-structure-search.util';
import { isUniqueConstraintViolation } from '../utils/unique-constraint.util';

@Injectable()
export class AcademicYearService {
  constructor(
    @InjectRepository(AcademicYearEntity)
    private readonly academicYearRepository: Repository<AcademicYearEntity>,
    private readonly parishService: ParishService,
    private readonly dataSource: DataSource,
  ) {}

  async createAcademicYear(
    rawParishId: string,
    input: CreateAcademicYearInput,
  ): Promise<AcademicYearSnapshot> {
    const parishSnapshot = await this.parishService.assertParishActive(rawParishId);
    const name = parseAcademicYearName(input.name);
    const startDate = parseIsoDateOnly(input.startDate);
    const endDate = parseIsoDateOnly(input.endDate);
    assertStartDateBeforeEndDate(startDate, endDate);

    const academicYear = this.academicYearRepository.create({
      parishId: parishSnapshot.id,
      name,
      startDate,
      endDate,
      status: AcademicYearStatus.Planned,
    });

    try {
      const savedAcademicYear = await this.academicYearRepository.save(academicYear);

      return toAcademicYearSnapshot(savedAcademicYear);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new AcademicYearAlreadyExistsError(name);
      }

      throw error;
    }
  }

  async getAcademicYearById(rawAcademicYearId: string): Promise<AcademicYearSnapshot> {
    const academicYear = await this.findAcademicYearEntity(rawAcademicYearId);

    return toAcademicYearSnapshot(academicYear);
  }

  async listAcademicYearsByParish(
    rawParishId: string,
    input: ListAcademicYearsInput,
  ): Promise<ListAcademicYearsResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);

    return this.listAcademicYears(parishSnapshot.id, input);
  }

  async updateAcademicYear(
    rawAcademicYearId: string,
    input: UpdateAcademicYearInput,
  ): Promise<AcademicYearSnapshot> {
    const academicYear = await this.findAcademicYearEntity(rawAcademicYearId);

    if (academicYear.status === AcademicYearStatus.Closed) {
      throw new AcademicYearClosedImmutableError();
    }

    await this.parishService.assertParishActive(academicYear.parishId);

    if (input.name !== undefined) {
      academicYear.name = parseAcademicYearName(input.name);
    }

    const startDate =
      input.startDate !== undefined ? parseIsoDateOnly(input.startDate) : academicYear.startDate;
    const endDate =
      input.endDate !== undefined ? parseIsoDateOnly(input.endDate) : academicYear.endDate;
    assertStartDateBeforeEndDate(startDate, endDate);
    academicYear.startDate = startDate;
    academicYear.endDate = endDate;

    try {
      const savedAcademicYear = await this.academicYearRepository.save(academicYear);

      return toAcademicYearSnapshot(savedAcademicYear);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new AcademicYearAlreadyExistsError(academicYear.name);
      }

      throw error;
    }
  }

  async updateAcademicYearStatus(
    rawAcademicYearId: string,
    status: AcademicYearStatus,
  ): Promise<AcademicYearSnapshot> {
    const academicYearId = this.parseAcademicYearId(rawAcademicYearId);

    if (status === AcademicYearStatus.Active) {
      return this.activateAcademicYear(academicYearId);
    }

    const academicYear = await this.findAcademicYearEntity(academicYearId);

    await this.parishService.assertParishActive(academicYear.parishId);

    if (academicYear.status !== AcademicYearStatus.Active || status !== AcademicYearStatus.Closed) {
      throw new InvalidAcademicYearStatusTransitionError();
    }

    academicYear.status = AcademicYearStatus.Closed;
    const savedAcademicYear = await this.academicYearRepository.save(academicYear);

    return toAcademicYearSnapshot(savedAcademicYear);
  }

  private async activateAcademicYear(academicYearId: string): Promise<AcademicYearSnapshot> {
    return this.dataSource.transaction(async (entityManager) => {
      const repository = entityManager.getRepository(AcademicYearEntity);
      const academicYear = await repository.findOne({
        where: { id: academicYearId },
        lock: { mode: 'pessimistic_write' },
      });

      if (academicYear === null) {
        throw new AcademicYearNotFoundError();
      }

      await this.parishService.assertParishActive(academicYear.parishId);

      if (academicYear.status !== AcademicYearStatus.Planned) {
        throw new InvalidAcademicYearStatusTransitionError();
      }

      await repository
        .createQueryBuilder('academicYear')
        .setLock('pessimistic_write')
        .where('academicYear.parishId = :parishId', { parishId: academicYear.parishId })
        .getMany();

      const existingActiveYear = await repository.findOne({
        where: {
          parishId: academicYear.parishId,
          status: AcademicYearStatus.Active,
        },
      });

      if (existingActiveYear !== null && existingActiveYear.id !== academicYear.id) {
        throw new ActiveAcademicYearAlreadyExistsError();
      }

      academicYear.status = AcademicYearStatus.Active;

      try {
        const savedAcademicYear = await repository.save(academicYear);

        return toAcademicYearSnapshot(savedAcademicYear);
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error)) {
          throw new ActiveAcademicYearAlreadyExistsError();
        }

        if (error instanceof QueryFailedError && error.message.includes('deadlock')) {
          throw new ActiveAcademicYearAlreadyExistsError();
        }

        throw error;
      }
    });
  }

  private async listAcademicYears(
    parishId: string,
    input: ListAcademicYearsInput,
  ): Promise<ListAcademicYearsResult> {
    const countQueryBuilder = this.academicYearRepository.createQueryBuilder('academicYear');
    countQueryBuilder.andWhere('academicYear.parishId = :parishId', { parishId });
    this.applyListFilters(countQueryBuilder, input);
    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.academicYearRepository.createQueryBuilder('academicYear');
    dataQueryBuilder.andWhere('academicYear.parishId = :parishId', { parishId });
    this.applyListFilters(dataQueryBuilder, input);
    dataQueryBuilder.orderBy(`academicYear.${input.sortBy}`, input.sort);
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const academicYears = await dataQueryBuilder.getMany();

    return {
      items: academicYears.map(toAcademicYearSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  private async findAcademicYearEntity(rawAcademicYearId: string): Promise<AcademicYearEntity> {
    const academicYearId = this.parseAcademicYearId(rawAcademicYearId);
    const academicYear = await this.academicYearRepository.findOne({
      where: { id: academicYearId },
    });

    if (academicYear === null) {
      throw new AcademicYearNotFoundError();
    }

    return academicYear;
  }

  private parseAcademicYearId(rawAcademicYearId: string): string {
    if (!isUuidV4(rawAcademicYearId)) {
      throw new InvalidAcademicYearIdError();
    }

    return normalizeUuid(rawAcademicYearId);
  }

  private applyListFilters(
    queryBuilder: SelectQueryBuilder<AcademicYearEntity>,
    input: ListAcademicYearsInput,
  ): void {
    if (input.status !== undefined) {
      queryBuilder.andWhere('academicYear.status = :status', { status: input.status });
    }

    if (input.search !== undefined) {
      const normalizedSearch = input.search.trim();

      if (normalizedSearch.length > 0) {
        const escapedSearch = escapeLikePattern(normalizedSearch.toLowerCase());

        queryBuilder.andWhere(
          new Brackets((subQueryBuilder) => {
            subQueryBuilder.where("LOWER(academicYear.name) LIKE :search ESCAPE '\\'", {
              search: `%${escapedSearch}%`,
            });
          }),
        );
      }
    }
  }
}
