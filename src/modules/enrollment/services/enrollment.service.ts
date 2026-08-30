import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassService } from '../../class/services/class.service';
import { StudentService } from '../../student/services/student.service';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import {
  EnrollmentImmutableError,
  EnrollmentNotActiveError,
  EnrollmentNotFoundError,
  EnrollmentTargetClassMismatchError,
  EnrollmentTransferSameClassError,
  InvalidEnrollmentIdError,
  InvalidEnrollmentStatusTransitionError,
  StudentAlreadyEnrolledInParishYearError,
} from '../errors/enrollment.errors';
import type {
  EnrollmentSnapshot,
  ListEnrollmentsInput,
  ListEnrollmentsResult,
  TransferEnrollmentInput,
} from '../interfaces/enrollment.interface';
import { toEnrollmentSnapshot } from '../mappers/enrollment.mapper';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    @Inject(forwardRef(() => StudentService))
    private readonly studentService: StudentService,
    private readonly classService: ClassService,
    private readonly dataSource: DataSource,
  ) {}

  async enrollStudent(rawClassId: string, rawStudentId: string): Promise<EnrollmentSnapshot> {
    const studentSnapshot = await this.studentService.assertStudentActive(rawStudentId);
    const classSnapshot = await this.classService.assertClassAcceptsEnrollment(rawClassId);

    const enrollment = this.enrollmentRepository.create({
      studentId: studentSnapshot.id,
      classId: classSnapshot.id,
      parishId: classSnapshot.parishId,
      academicYearId: classSnapshot.academicYearId,
      status: EnrollmentStatus.Active,
      enrolledAt: new Date(),
      leftAt: null,
    });

    try {
      const savedEnrollment = await this.enrollmentRepository.save(enrollment);

      return toEnrollmentSnapshot(savedEnrollment);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new StudentAlreadyEnrolledInParishYearError();
      }

      throw error;
    }
  }

  async getEnrollmentById(rawEnrollmentId: string): Promise<EnrollmentSnapshot> {
    const enrollment = await this.findEnrollmentEntity(rawEnrollmentId);

    return toEnrollmentSnapshot(enrollment);
  }

  async listEnrollmentsByClass(
    rawClassId: string,
    input: ListEnrollmentsInput,
  ): Promise<ListEnrollmentsResult> {
    const classSnapshot = await this.classService.getClassById(rawClassId);

    return this.listEnrollments({ classId: classSnapshot.id }, input);
  }

  async listEnrollmentsByStudent(
    rawStudentId: string,
    input: ListEnrollmentsInput,
  ): Promise<ListEnrollmentsResult> {
    const studentSnapshot = await this.studentService.getStudentById(rawStudentId);

    return this.listEnrollments({ studentId: studentSnapshot.id }, input);
  }

  async updateEnrollmentStatus(
    rawEnrollmentId: string,
    status: EnrollmentStatus,
  ): Promise<EnrollmentSnapshot> {
    if (status !== EnrollmentStatus.Completed && status !== EnrollmentStatus.Withdrawn) {
      throw new InvalidEnrollmentStatusTransitionError();
    }

    const enrollment = await this.findEnrollmentEntity(rawEnrollmentId);

    if (enrollment.status !== EnrollmentStatus.Active) {
      throw new EnrollmentImmutableError();
    }

    enrollment.status = status;
    enrollment.leftAt = new Date();

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    return toEnrollmentSnapshot(savedEnrollment);
  }

  async transferEnrollment(
    rawEnrollmentId: string,
    input: TransferEnrollmentInput,
  ): Promise<EnrollmentSnapshot> {
    return this.dataSource.transaction(async (entityManager) => {
      const enrollmentRepository = entityManager.getRepository(EnrollmentEntity);
      const sourceEnrollment = await this.findEnrollmentEntity(
        rawEnrollmentId,
        enrollmentRepository,
      );

      if (sourceEnrollment.status !== EnrollmentStatus.Active) {
        throw new EnrollmentNotActiveError();
      }

      const targetClassSnapshot = await this.classService.assertClassAcceptsEnrollment(
        input.targetClassId,
      );

      if (
        normalizeUuid(sourceEnrollment.parishId) !== normalizeUuid(targetClassSnapshot.parishId) ||
        normalizeUuid(sourceEnrollment.academicYearId) !==
          normalizeUuid(targetClassSnapshot.academicYearId)
      ) {
        throw new EnrollmentTargetClassMismatchError();
      }

      if (normalizeUuid(sourceEnrollment.classId) === normalizeUuid(targetClassSnapshot.id)) {
        throw new EnrollmentTransferSameClassError();
      }

      sourceEnrollment.status = EnrollmentStatus.Transferred;
      sourceEnrollment.leftAt = new Date();
      await enrollmentRepository.save(sourceEnrollment);

      const targetEnrollment = enrollmentRepository.create({
        studentId: sourceEnrollment.studentId,
        classId: targetClassSnapshot.id,
        parishId: targetClassSnapshot.parishId,
        academicYearId: targetClassSnapshot.academicYearId,
        status: EnrollmentStatus.Active,
        enrolledAt: new Date(),
        leftAt: null,
      });

      try {
        const savedEnrollment = await enrollmentRepository.save(targetEnrollment);

        return toEnrollmentSnapshot(savedEnrollment);
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error)) {
          throw new StudentAlreadyEnrolledInParishYearError();
        }

        throw error;
      }
    });
  }

  private async listEnrollments(
    scope: { classId: string } | { studentId: string },
    input: ListEnrollmentsInput,
  ): Promise<ListEnrollmentsResult> {
    const countQueryBuilder = this.enrollmentRepository.createQueryBuilder('enrollment');
    this.applyScope(countQueryBuilder, scope);
    this.applyListFilters(countQueryBuilder, input);
    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.enrollmentRepository.createQueryBuilder('enrollment');
    this.applyScope(dataQueryBuilder, scope);
    this.applyListFilters(dataQueryBuilder, input);
    dataQueryBuilder.orderBy(`enrollment.${input.sortBy}`, input.sort);
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const enrollments = await dataQueryBuilder.getMany();

    return {
      items: enrollments.map(toEnrollmentSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  private async findEnrollmentEntity(
    rawEnrollmentId: string,
    repository: Repository<EnrollmentEntity> = this.enrollmentRepository,
  ): Promise<EnrollmentEntity> {
    const enrollmentId = this.parseEnrollmentId(rawEnrollmentId);
    const enrollment = await repository.findOne({
      where: { id: enrollmentId },
    });

    if (enrollment === null) {
      throw new EnrollmentNotFoundError();
    }

    return enrollment;
  }

  private parseEnrollmentId(rawEnrollmentId: string): string {
    if (!isUuidV4(rawEnrollmentId)) {
      throw new InvalidEnrollmentIdError();
    }

    return normalizeUuid(rawEnrollmentId);
  }

  private applyScope(
    queryBuilder: SelectQueryBuilder<EnrollmentEntity>,
    scope: { classId: string } | { studentId: string },
  ): void {
    if ('classId' in scope) {
      queryBuilder.andWhere('enrollment.classId = :classId', { classId: scope.classId });

      return;
    }

    queryBuilder.andWhere('enrollment.studentId = :studentId', { studentId: scope.studentId });
  }

  private applyListFilters(
    queryBuilder: SelectQueryBuilder<EnrollmentEntity>,
    input: ListEnrollmentsInput,
  ): void {
    if (input.status !== undefined) {
      queryBuilder.andWhere('enrollment.status = :status', { status: input.status });
    }
  }
}
