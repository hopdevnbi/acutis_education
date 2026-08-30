import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository, SelectQueryBuilder } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UserAccountService } from '../../users/services/user-account.service';
import { StudentEntity } from '../entities/student.entity';
import { StudentStatus } from '../enums/student-status.enum';
import {
  InvalidStudentIdError,
  InvalidStudentUserIdError,
  StudentInactiveError,
  StudentLinkedUserNotFoundError,
  StudentNotFoundError,
  StudentUpdateRequiresFieldsError,
  StudentUserAlreadyLinkedError,
} from '../errors/student.errors';
import type {
  CreateStudentInput,
  ListStudentsInput,
  ListStudentsResult,
  StudentSnapshot,
  UpdateStudentInput,
} from '../interfaces/student.interface';
import { toStudentSnapshot } from '../mappers/student.mapper';
import { parseStudentFullName } from '../utils/student-full-name.util';
import { escapeLikePattern } from '../utils/student-search.util';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepository: Repository<StudentEntity>,
    private readonly userAccountService: UserAccountService,
  ) {}

  async createStudent(input: CreateStudentInput): Promise<StudentSnapshot> {
    const fullName = parseStudentFullName(input.fullName);
    const userId = await this.resolveOptionalUserId(input.userId);

    const studentEntity = this.studentRepository.create({
      fullName,
      userId,
      status: StudentStatus.Active,
    });

    try {
      const savedStudent = await this.studentRepository.save(studentEntity);

      return toStudentSnapshot(savedStudent);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new StudentUserAlreadyLinkedError();
      }

      throw error;
    }
  }

  async getStudentById(rawStudentId: string): Promise<StudentSnapshot> {
    const studentEntity = await this.findStudentEntity(rawStudentId);

    return toStudentSnapshot(studentEntity);
  }

  async getStudentSnapshotsByIds(rawStudentIds: readonly string[]): Promise<StudentSnapshot[]> {
    if (rawStudentIds.length === 0) {
      return [];
    }

    const studentIds = rawStudentIds.map((studentId) => this.parseStudentId(studentId));
    const students = await this.studentRepository.find({
      where: { id: In(studentIds) },
    });
    const snapshotsById = new Map(
      students.map((student) => [normalizeUuid(student.id), toStudentSnapshot(student)]),
    );

    return studentIds
      .map((studentId) => snapshotsById.get(studentId))
      .filter((snapshot): snapshot is StudentSnapshot => snapshot !== undefined);
  }

  async listStudents(input: ListStudentsInput): Promise<ListStudentsResult> {
    const countQueryBuilder = this.studentRepository.createQueryBuilder('student');
    this.applyListFilters(countQueryBuilder, input);
    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.studentRepository.createQueryBuilder('student');
    this.applyListFilters(dataQueryBuilder, input);
    dataQueryBuilder.orderBy(`student.${input.sortBy}`, input.sort);
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const students = await dataQueryBuilder.getMany();

    return {
      items: students.map(toStudentSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async updateStudent(rawStudentId: string, input: UpdateStudentInput): Promise<StudentSnapshot> {
    if (input.fullName === undefined && input.userId === undefined && input.status === undefined) {
      throw new StudentUpdateRequiresFieldsError();
    }

    const studentEntity = await this.findStudentEntity(rawStudentId);

    if (input.fullName !== undefined) {
      studentEntity.fullName = parseStudentFullName(input.fullName);
    }

    if (input.userId !== undefined) {
      studentEntity.userId = await this.resolveOptionalUserId(input.userId);
    }

    if (input.status !== undefined) {
      studentEntity.status = input.status;
    }

    try {
      const savedStudent = await this.studentRepository.save(studentEntity);

      return toStudentSnapshot(savedStudent);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new StudentUserAlreadyLinkedError();
      }

      throw error;
    }
  }

  async assertStudentActive(rawStudentId: string): Promise<StudentSnapshot> {
    const snapshot = await this.getStudentById(rawStudentId);

    if (snapshot.status !== StudentStatus.Active) {
      throw new StudentInactiveError();
    }

    return snapshot;
  }

  private async resolveOptionalUserId(
    rawUserId: string | null | undefined,
  ): Promise<string | null> {
    if (rawUserId === undefined || rawUserId === null) {
      return null;
    }

    if (!isUuidV4(rawUserId)) {
      throw new InvalidStudentUserIdError();
    }

    const userId = normalizeUuid(rawUserId);
    const accountSnapshot = await this.userAccountService.getAccountSnapshotById(userId);

    if (accountSnapshot === null) {
      throw new StudentLinkedUserNotFoundError();
    }

    if (accountSnapshot.status !== UserStatus.Active) {
      throw new StudentLinkedUserNotFoundError();
    }

    return userId;
  }

  private async findStudentEntity(rawStudentId: string): Promise<StudentEntity> {
    const studentId = this.parseStudentId(rawStudentId);
    const studentEntity = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    if (studentEntity === null) {
      throw new StudentNotFoundError();
    }

    return studentEntity;
  }

  private parseStudentId(rawStudentId: string): string {
    if (!isUuidV4(rawStudentId)) {
      throw new InvalidStudentIdError();
    }

    return normalizeUuid(rawStudentId);
  }

  private applyListFilters(
    queryBuilder: SelectQueryBuilder<StudentEntity>,
    input: ListStudentsInput,
  ): void {
    if (input.status !== undefined) {
      queryBuilder.andWhere('student.status = :status', { status: input.status });
    }

    if (input.search !== undefined) {
      const normalizedSearch = input.search.trim();

      if (normalizedSearch.length > 0) {
        const escapedSearch = escapeLikePattern(normalizedSearch.toLowerCase());

        queryBuilder.andWhere("LOWER(student.fullName) LIKE :search ESCAPE '\\'", {
          search: `%${escapedSearch}%`,
        });
      }
    }
  }
}
