import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { AcademicYearStatus } from '../../academic-structure/enums/academic-year-status.enum';
import { AcademicYearService } from '../../academic-structure/services/academic-year.service';
import { CatechismLevelStatus } from '../../academic-structure/enums/catechism-level-status.enum';
import { CatechismLevelService } from '../../academic-structure/services/catechism-level.service';
import { ParishService } from '../../parish/services/parish.service';
import { ClassEntity } from '../entities/class.entity';
import { ClassStatus } from '../enums/class-status.enum';
import {
  ClassAcademicYearNotOperationalError,
  ClassCatechismLevelInactiveError,
  ClassCodeAlreadyExistsError,
  ClassImmutableError,
  ClassNotAcceptingEnrollmentError,
  ClassNotFoundError,
  InvalidClassIdError,
  InvalidClassStatusTransitionError,
  ClassUpdateRequiresFieldsError,
} from '../errors/class.errors';
import type {
  ClassSnapshot,
  CreateClassInput,
  ListClassesInput,
  ListClassesResult,
  UpdateClassInput,
} from '../interfaces/class.interface';
import { toClassSnapshot } from '../mappers/class.mapper';
import { parseClassCode } from '../utils/class-code.util';
import { parseClassName } from '../utils/class-name.util';
import { escapeLikePattern } from '../utils/class-search.util';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
    private readonly parishService: ParishService,
    private readonly academicYearService: AcademicYearService,
    private readonly catechismLevelService: CatechismLevelService,
  ) {}

  async createClass(rawParishId: string, input: CreateClassInput): Promise<ClassSnapshot> {
    const parishSnapshot = await this.parishService.assertParishActive(rawParishId);
    const academicYearSnapshot = await this.academicYearService.assertAcademicYearBelongsToParish(
      input.academicYearId,
      parishSnapshot.id,
    );
    this.assertAcademicYearOperationalForClassCreation(academicYearSnapshot.status);

    const catechismLevelSnapshot =
      await this.catechismLevelService.assertCatechismLevelBelongsToParish(
        input.catechismLevelId,
        parishSnapshot.id,
      );
    this.assertCatechismLevelActiveForClassCreation(catechismLevelSnapshot.status);

    const code = parseClassCode(input.code);
    const name = parseClassName(input.name);

    const classEntity = this.classRepository.create({
      parishId: parishSnapshot.id,
      academicYearId: academicYearSnapshot.id,
      catechismLevelId: catechismLevelSnapshot.id,
      code,
      name,
      status: ClassStatus.Planned,
    });

    try {
      const savedClass = await this.classRepository.save(classEntity);

      return toClassSnapshot(savedClass);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new ClassCodeAlreadyExistsError(code);
      }

      throw error;
    }
  }

  async getClassById(rawClassId: string): Promise<ClassSnapshot> {
    const classEntity = await this.findClassEntity(rawClassId);

    return toClassSnapshot(classEntity);
  }

  async getClassSnapshotForEnrollment(rawClassId: string): Promise<ClassSnapshot> {
    return this.getClassById(rawClassId);
  }

  async assertClassAcceptsEnrollment(rawClassId: string): Promise<ClassSnapshot> {
    const classEntity = await this.findClassEntity(rawClassId);

    if (classEntity.status !== ClassStatus.Active) {
      throw new ClassNotAcceptingEnrollmentError();
    }

    return toClassSnapshot(classEntity);
  }

  async listClassesByParish(
    rawParishId: string,
    input: ListClassesInput,
  ): Promise<ListClassesResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);

    return this.listClasses(parishSnapshot.id, input);
  }

  async updateClass(rawClassId: string, input: UpdateClassInput): Promise<ClassSnapshot> {
    if (input.code === undefined && input.name === undefined) {
      throw new ClassUpdateRequiresFieldsError();
    }

    const classEntity = await this.findClassEntity(rawClassId);
    this.assertClassMutable(classEntity.status);
    await this.parishService.assertParishActive(classEntity.parishId);

    if (input.code !== undefined) {
      classEntity.code = parseClassCode(input.code);
    }

    if (input.name !== undefined) {
      classEntity.name = parseClassName(input.name);
    }

    try {
      const savedClass = await this.classRepository.save(classEntity);

      return toClassSnapshot(savedClass);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new ClassCodeAlreadyExistsError(classEntity.code);
      }

      throw error;
    }
  }

  async updateClassStatus(rawClassId: string, status: ClassStatus): Promise<ClassSnapshot> {
    const classEntity = await this.findClassEntity(rawClassId);

    if (
      classEntity.status === ClassStatus.Completed ||
      classEntity.status === ClassStatus.Cancelled
    ) {
      throw new ClassImmutableError();
    }

    if (status === ClassStatus.Active) {
      return this.activateClass(classEntity);
    }

    if (status === ClassStatus.Completed) {
      return this.completeClass(classEntity);
    }

    if (status === ClassStatus.Cancelled) {
      return this.cancelClass(classEntity);
    }

    throw new InvalidClassStatusTransitionError();
  }

  private async activateClass(classEntity: ClassEntity): Promise<ClassSnapshot> {
    if (classEntity.status !== ClassStatus.Planned) {
      throw new InvalidClassStatusTransitionError();
    }

    await this.parishService.assertParishActive(classEntity.parishId);

    const academicYearSnapshot = await this.academicYearService.assertAcademicYearBelongsToParish(
      classEntity.academicYearId,
      classEntity.parishId,
    );

    if (academicYearSnapshot.status !== AcademicYearStatus.Active) {
      throw new ClassAcademicYearNotOperationalError();
    }

    const catechismLevelSnapshot =
      await this.catechismLevelService.assertCatechismLevelBelongsToParish(
        classEntity.catechismLevelId,
        classEntity.parishId,
      );

    if (catechismLevelSnapshot.status !== CatechismLevelStatus.Active) {
      throw new ClassCatechismLevelInactiveError();
    }

    classEntity.status = ClassStatus.Active;
    const savedClass = await this.classRepository.save(classEntity);

    return toClassSnapshot(savedClass);
  }

  private async completeClass(classEntity: ClassEntity): Promise<ClassSnapshot> {
    if (classEntity.status !== ClassStatus.Active) {
      throw new InvalidClassStatusTransitionError();
    }

    await this.parishService.assertParishActive(classEntity.parishId);

    classEntity.status = ClassStatus.Completed;
    const savedClass = await this.classRepository.save(classEntity);

    return toClassSnapshot(savedClass);
  }

  private async cancelClass(classEntity: ClassEntity): Promise<ClassSnapshot> {
    if (classEntity.status !== ClassStatus.Planned && classEntity.status !== ClassStatus.Active) {
      throw new InvalidClassStatusTransitionError();
    }

    classEntity.status = ClassStatus.Cancelled;
    const savedClass = await this.classRepository.save(classEntity);

    return toClassSnapshot(savedClass);
  }

  private async listClasses(parishId: string, input: ListClassesInput): Promise<ListClassesResult> {
    const countQueryBuilder = this.classRepository.createQueryBuilder('class');
    countQueryBuilder.andWhere('class.parishId = :parishId', { parishId });
    this.applyListFilters(countQueryBuilder, input);
    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.classRepository.createQueryBuilder('class');
    dataQueryBuilder.andWhere('class.parishId = :parishId', { parishId });
    this.applyListFilters(dataQueryBuilder, input);
    dataQueryBuilder.orderBy(`class.${input.sortBy}`, input.sort);
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const classes = await dataQueryBuilder.getMany();

    return {
      items: classes.map(toClassSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  private async findClassEntity(rawClassId: string): Promise<ClassEntity> {
    const classId = this.parseClassId(rawClassId);
    const classEntity = await this.classRepository.findOne({
      where: { id: classId },
    });

    if (classEntity === null) {
      throw new ClassNotFoundError();
    }

    return classEntity;
  }

  private parseClassId(rawClassId: string): string {
    if (!isUuidV4(rawClassId)) {
      throw new InvalidClassIdError();
    }

    return normalizeUuid(rawClassId);
  }

  private assertClassMutable(status: ClassStatus): void {
    if (status === ClassStatus.Completed || status === ClassStatus.Cancelled) {
      throw new ClassImmutableError();
    }
  }

  private assertAcademicYearOperationalForClassCreation(status: AcademicYearStatus): void {
    if (status === AcademicYearStatus.Closed) {
      throw new ClassAcademicYearNotOperationalError();
    }
  }

  private assertCatechismLevelActiveForClassCreation(status: CatechismLevelStatus): void {
    if (status !== CatechismLevelStatus.Active) {
      throw new ClassCatechismLevelInactiveError();
    }
  }

  private applyListFilters(
    queryBuilder: SelectQueryBuilder<ClassEntity>,
    input: ListClassesInput,
  ): void {
    if (input.academicYearId !== undefined) {
      queryBuilder.andWhere('class.academicYearId = :academicYearId', {
        academicYearId: normalizeUuid(input.academicYearId),
      });
    }

    if (input.catechismLevelId !== undefined) {
      queryBuilder.andWhere('class.catechismLevelId = :catechismLevelId', {
        catechismLevelId: normalizeUuid(input.catechismLevelId),
      });
    }

    if (input.status !== undefined) {
      queryBuilder.andWhere('class.status = :status', { status: input.status });
    }

    if (input.search !== undefined) {
      const normalizedSearch = input.search.trim();

      if (normalizedSearch.length > 0) {
        const escapedSearch = escapeLikePattern(normalizedSearch.toLowerCase());

        queryBuilder.andWhere(
          new Brackets((subQueryBuilder) => {
            subQueryBuilder
              .where("LOWER(class.name) LIKE :search ESCAPE '\\'", {
                search: `%${escapedSearch}%`,
              })
              .orWhere("LOWER(class.code) LIKE :search ESCAPE '\\'", {
                search: `%${escapedSearch}%`,
              });
          }),
        );
      }
    }
  }
}
