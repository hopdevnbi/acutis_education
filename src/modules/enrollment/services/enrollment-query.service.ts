import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import type {
  ListParishEnrollmentStudentsInput,
  ListParishEnrollmentStudentsResult,
} from '../interfaces/enrollment-query.interface';
import type { EnrollmentSnapshot } from '../interfaces/enrollment.interface';
import { toEnrollmentSnapshot } from '../mappers/enrollment.mapper';

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

@Injectable()
export class EnrollmentQueryService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
  ) {}

  async listDistinctActiveStudentIdsInParish(
    rawParishId: string,
    input: ListParishEnrollmentStudentsInput,
  ): Promise<ListParishEnrollmentStudentsResult> {
    const parishId = normalizeUuid(rawParishId);
    const requiresStudentJoin = input.search !== undefined && input.search.trim().length > 0;

    const countQueryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('COUNT(DISTINCT enrollment.studentId)', 'total')
      .where('enrollment.parishId = :parishId', { parishId })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.Active });

    this.applyEnrollmentFilters(countQueryBuilder, input);

    if (requiresStudentJoin) {
      countQueryBuilder.innerJoin('students', 'student', 'student.id = enrollment.student_id');
      this.applyStudentSearchFilter(countQueryBuilder, input);
    }

    const countResult = await countQueryBuilder.getRawOne<{ total: string }>();
    const total = Number(countResult?.total ?? 0);

    const dataQueryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('students', 'student', 'student.id = enrollment.student_id')
      .select('student.id', 'studentId')
      .where('enrollment.parishId = :parishId', { parishId })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.Active });

    this.applyEnrollmentFilters(dataQueryBuilder, input);
    this.applyStudentSearchFilter(dataQueryBuilder, input);
    dataQueryBuilder.groupBy('student.id');
    dataQueryBuilder.addGroupBy('student.full_name');
    dataQueryBuilder.addGroupBy('student.created_at');

    const sortColumn = input.sortBy === 'fullName' ? 'student.full_name' : 'student.created_at';

    dataQueryBuilder.orderBy(sortColumn, input.sort);
    dataQueryBuilder.offset((input.page - 1) * input.limit);
    dataQueryBuilder.limit(input.limit);

    const rows = await dataQueryBuilder.getRawMany<{ studentId: string }>();

    return {
      studentIds: rows.map((row) => normalizeUuid(row.studentId)),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async hasGuardianLinkedStudentInParish(
    rawGuardianUserId: string,
    rawParishId: string,
  ): Promise<boolean> {
    if (!isUuidV4(rawGuardianUserId) || !isUuidV4(rawParishId)) {
      return false;
    }

    const guardianUserId = normalizeUuid(rawGuardianUserId);
    const parishId = normalizeUuid(rawParishId);
    const count = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin(
        'student_guardians',
        'guardianLink',
        'guardianLink.student_id = enrollment.student_id',
      )
      .where('guardianLink.guardian_user_id = :guardianUserId', { guardianUserId })
      .andWhere('guardianLink.status = :guardianStatus', { guardianStatus: 'ACTIVE' })
      .andWhere('enrollment.parishId = :parishId', { parishId })
      .andWhere('enrollment.status = :enrollmentStatus', {
        enrollmentStatus: EnrollmentStatus.Active,
      })
      .getCount();

    return count > 0;
  }

  async hasGuardianLinkedStudentInClass(
    rawGuardianUserId: string,
    rawClassId: string,
  ): Promise<boolean> {
    if (!isUuidV4(rawGuardianUserId) || !isUuidV4(rawClassId)) {
      return false;
    }

    const guardianUserId = normalizeUuid(rawGuardianUserId);
    const classId = normalizeUuid(rawClassId);
    const count = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin(
        'student_guardians',
        'guardianLink',
        'guardianLink.student_id = enrollment.student_id',
      )
      .where('guardianLink.guardian_user_id = :guardianUserId', { guardianUserId })
      .andWhere('guardianLink.status = :guardianStatus', { guardianStatus: 'ACTIVE' })
      .andWhere('enrollment.classId = :classId', { classId })
      .andWhere('enrollment.status = :enrollmentStatus', {
        enrollmentStatus: EnrollmentStatus.Active,
      })
      .getCount();

    return count > 0;
  }

  async listStudentIdsForGuardian(rawGuardianUserId: string): Promise<string[]> {
    if (!isUuidV4(rawGuardianUserId)) {
      return [];
    }

    const guardianUserId = normalizeUuid(rawGuardianUserId);
    const rows = await this.enrollmentRepository.manager
      .createQueryBuilder()
      .select('DISTINCT guardianLink.student_id', 'studentId')
      .from('student_guardians', 'guardianLink')
      .where('guardianLink.guardian_user_id = :guardianUserId', { guardianUserId })
      .andWhere('guardianLink.status = :guardianStatus', { guardianStatus: 'ACTIVE' })
      .getRawMany<{ studentId: string }>();

    return rows.map((row) => normalizeUuid(row.studentId));
  }

  async listActiveStudentIdsInParishes(parishIds: readonly string[]): Promise<string[]> {
    if (parishIds.length === 0) {
      return [];
    }

    const normalizedParishIds = parishIds.map((parishId) => normalizeUuid(parishId));
    const rows = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('DISTINCT enrollment.studentId', 'studentId')
      .where('enrollment.parishId IN (:...parishIds)', { parishIds: normalizedParishIds })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.Active })
      .getRawMany<{ studentId: string }>();

    return rows.map((row) => normalizeUuid(row.studentId));
  }

  async listActiveStudentIdsInClasses(classIds: readonly string[]): Promise<string[]> {
    if (classIds.length === 0) {
      return [];
    }

    const normalizedClassIds = classIds.map((classId) => normalizeUuid(classId));
    const rows = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('DISTINCT enrollment.studentId', 'studentId')
      .where('enrollment.classId IN (:...classIds)', { classIds: normalizedClassIds })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.Active })
      .getRawMany<{ studentId: string }>();

    return rows.map((row) => normalizeUuid(row.studentId));
  }

  async hasActiveEnrollmentInParishForStudent(
    rawStudentId: string,
    rawParishId: string,
  ): Promise<boolean> {
    if (!isUuidV4(rawStudentId) || !isUuidV4(rawParishId)) {
      return false;
    }

    const studentId = normalizeUuid(rawStudentId);
    const parishId = normalizeUuid(rawParishId);
    const count = await this.enrollmentRepository.count({
      where: {
        studentId,
        parishId,
        status: EnrollmentStatus.Active,
      },
    });

    return count > 0;
  }

  async hasActiveEnrollmentInAssignedClassForStudent(
    rawStudentId: string,
    classIds: readonly string[],
  ): Promise<boolean> {
    if (!isUuidV4(rawStudentId) || classIds.length === 0) {
      return false;
    }

    const studentId = normalizeUuid(rawStudentId);
    const normalizedClassIds = classIds.map((classId) => normalizeUuid(classId));
    const count = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('enrollment.classId IN (:...classIds)', { classIds: normalizedClassIds })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.Active })
      .getCount();

    return count > 0;
  }

  async getEnrollmentSnapshotsByIds(
    rawEnrollmentIds: readonly string[],
  ): Promise<EnrollmentSnapshot[]> {
    const uniqueEnrollmentIds = [
      ...new Set(
        rawEnrollmentIds.filter(isUuidV4).map((enrollmentId) => normalizeUuid(enrollmentId)),
      ),
    ];

    if (uniqueEnrollmentIds.length === 0) {
      return [];
    }

    const enrollmentEntities = await this.enrollmentRepository.find({
      where: { id: In(uniqueEnrollmentIds) },
    });
    const snapshotsById = new Map(
      enrollmentEntities.map((enrollmentEntity) => [
        normalizeUuid(enrollmentEntity.id),
        toEnrollmentSnapshot(enrollmentEntity),
      ]),
    );

    return uniqueEnrollmentIds
      .map((enrollmentId) => snapshotsById.get(enrollmentId))
      .filter((snapshot): snapshot is EnrollmentSnapshot => snapshot !== undefined);
  }

  async countActiveEnrollmentsByClassIds(
    rawClassIds: readonly string[],
  ): Promise<Map<string, number>> {
    const uniqueClassIds = [
      ...new Set(rawClassIds.filter(isUuidV4).map((classId) => normalizeUuid(classId))),
    ];

    if (uniqueClassIds.length === 0) {
      return new Map();
    }

    const countRows = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('enrollment.classId', 'classId')
      .addSelect('COUNT(*)', 'count')
      .where('enrollment.classId IN (:...classIds)', { classIds: uniqueClassIds })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.Active })
      .groupBy('enrollment.classId')
      .getRawMany<{ classId: string; count: string }>();

    return new Map(countRows.map((row) => [normalizeUuid(row.classId), Number(row.count ?? 0)]));
  }

  async listActiveEnrollmentsByStudentIds(
    rawStudentIds: readonly string[],
  ): Promise<EnrollmentSnapshot[]> {
    const uniqueStudentIds = [
      ...new Set(rawStudentIds.filter(isUuidV4).map((studentId) => normalizeUuid(studentId))),
    ];

    if (uniqueStudentIds.length === 0) {
      return [];
    }

    const enrollmentEntities = await this.enrollmentRepository.find({
      where: {
        studentId: In(uniqueStudentIds),
        status: EnrollmentStatus.Active,
      },
      order: { enrolledAt: 'DESC' },
    });

    return enrollmentEntities.map((enrollmentEntity) => toEnrollmentSnapshot(enrollmentEntity));
  }

  private applyEnrollmentFilters(
    queryBuilder: SelectQueryBuilder<EnrollmentEntity>,
    input: ListParishEnrollmentStudentsInput,
  ): void {
    if (input.academicYearId !== undefined) {
      queryBuilder.andWhere('enrollment.academicYearId = :academicYearId', {
        academicYearId: normalizeUuid(input.academicYearId),
      });
    }
  }

  private applyStudentSearchFilter(
    queryBuilder: SelectQueryBuilder<EnrollmentEntity>,
    input: ListParishEnrollmentStudentsInput,
  ): void {
    if (input.search === undefined) {
      return;
    }

    const normalizedSearch = input.search.trim();

    if (normalizedSearch.length === 0) {
      return;
    }

    const escapedSearch = escapeLikePattern(normalizedSearch.toLowerCase());

    queryBuilder.andWhere("LOWER(student.full_name) LIKE :search ESCAPE '\\'", {
      search: `%${escapedSearch}%`,
    });
  }
}
