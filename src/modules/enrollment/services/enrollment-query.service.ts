import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import type {
  ListParishEnrollmentStudentsInput,
  ListParishEnrollmentStudentsResult,
} from '../interfaces/enrollment-query.interface';

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
