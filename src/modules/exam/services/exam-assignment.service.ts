import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassService } from '../../class/services/class.service';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';
import { ExamVersionStatus } from '../enums/exam-version-status.enum';
import {
  ExamAssignmentClassParishMismatchError,
  ExamAssignmentNotFoundError,
  ExamAssignmentUpdateRequiresFieldsError,
  ExamAssignmentVersionNotPublishedError,
  InvalidExamAssignmentIdError,
  InvalidExamAssignmentWindowError,
} from '../errors/exam.errors';
import type {
  CreateExamAssignmentInput,
  ExamAssignmentSnapshot,
  ListExamAssignmentsInput,
  ListExamAssignmentsResult,
  UpdateExamAssignmentInput,
} from '../interfaces/exam.interface';
import { toExamAssignmentSnapshot } from '../mappers/exam.mapper';
import {
  resolveExamAssignmentEffectiveStatus,
  resolveInitialExamAssignmentStatus,
} from '../utils/exam-assignment-status.util';
import { ExamService } from './exam.service';

@Injectable()
export class ExamAssignmentService {
  constructor(
    @InjectRepository(ExamAssignmentEntity)
    private readonly examAssignmentRepository: Repository<ExamAssignmentEntity>,
    private readonly examService: ExamService,
    private readonly classService: ClassService,
  ) {}

  async createAssignment(
    rawParishId: string,
    rawClassId: string,
    createdByUserId: string,
    input: CreateExamAssignmentInput,
  ): Promise<ExamAssignmentSnapshot> {
    const parishId = normalizeUuid(rawParishId);
    const classSnapshot = await this.classService.getClassById(rawClassId);

    if (normalizeUuid(classSnapshot.parishId) !== parishId) {
      throw new ExamAssignmentClassParishMismatchError();
    }

    const version = await this.examService.getVersionById(input.examVersionId);

    if (version.status !== ExamVersionStatus.Published) {
      throw new ExamAssignmentVersionNotPublishedError();
    }

    const examParishId = await this.examService.getExamParishId(version.examId);

    if (examParishId !== parishId) {
      throw new ExamAssignmentClassParishMismatchError();
    }

    const opensAt = input.opensAt;
    const closesAt = input.closesAt;

    if (closesAt.getTime() <= opensAt.getTime()) {
      throw new InvalidExamAssignmentWindowError();
    }

    const assignment = this.examAssignmentRepository.create({
      examVersionId: version.id,
      classId: classSnapshot.id,
      opensAt,
      closesAt,
      status: resolveInitialExamAssignmentStatus(opensAt, closesAt),
      createdByUserId: normalizeUuid(createdByUserId),
    });

    const savedAssignment = await this.examAssignmentRepository.save(assignment);

    return toExamAssignmentSnapshot(savedAssignment);
  }

  async listAssignmentsByClass(
    rawParishId: string,
    rawClassId: string,
    input: ListExamAssignmentsInput,
  ): Promise<ListExamAssignmentsResult> {
    const parishId = normalizeUuid(rawParishId);
    const classSnapshot = await this.classService.getClassById(rawClassId);

    if (normalizeUuid(classSnapshot.parishId) !== parishId) {
      throw new ExamAssignmentClassParishMismatchError();
    }

    const queryBuilder = this.examAssignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.classId = :classId', { classId: classSnapshot.id });

    if (input.status !== undefined) {
      queryBuilder.andWhere('assignment.status = :status', { status: input.status });
    }

    const total = await queryBuilder.getCount();
    const sortColumn =
      input.sortBy === 'opensAt'
        ? 'assignment.opensAt'
        : input.sortBy === 'closesAt'
          ? 'assignment.closesAt'
          : 'assignment.createdAt';

    const entities = await queryBuilder
      .orderBy(sortColumn, input.sort)
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .getMany();

    return {
      items: entities.map((entity) => toExamAssignmentSnapshot(entity)),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async getAssignmentById(rawAssignmentId: string): Promise<ExamAssignmentSnapshot> {
    const assignment = await this.findAssignmentEntity(rawAssignmentId);

    return toExamAssignmentSnapshot(assignment);
  }

  async getAssignmentParishId(rawAssignmentId: string): Promise<string> {
    const assignment = await this.findAssignmentEntity(rawAssignmentId);
    const classSnapshot = await this.classService.getClassById(assignment.classId);

    return normalizeUuid(classSnapshot.parishId);
  }

  async updateAssignment(
    rawAssignmentId: string,
    input: UpdateExamAssignmentInput,
  ): Promise<ExamAssignmentSnapshot> {
    if (input.opensAt === undefined && input.closesAt === undefined && input.status === undefined) {
      throw new ExamAssignmentUpdateRequiresFieldsError();
    }

    const assignment = await this.findAssignmentEntity(rawAssignmentId);
    const opensAt = input.opensAt ?? assignment.opensAt;
    const closesAt = input.closesAt ?? assignment.closesAt;

    if (closesAt.getTime() <= opensAt.getTime()) {
      throw new InvalidExamAssignmentWindowError();
    }

    assignment.opensAt = opensAt;
    assignment.closesAt = closesAt;

    if (input.status !== undefined) {
      assignment.status = input.status;
    } else if (assignment.status !== ExamAssignmentStatus.Cancelled) {
      assignment.status = resolveExamAssignmentEffectiveStatus(
        ExamAssignmentStatus.Scheduled,
        opensAt,
        closesAt,
      );
    }

    const savedAssignment = await this.examAssignmentRepository.save(assignment);

    return toExamAssignmentSnapshot(savedAssignment);
  }

  private async findAssignmentEntity(rawAssignmentId: string): Promise<ExamAssignmentEntity> {
    if (!isUuidV4(rawAssignmentId)) {
      throw new InvalidExamAssignmentIdError();
    }

    const assignmentId = normalizeUuid(rawAssignmentId);
    const assignment = await this.examAssignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (assignment === null) {
      throw new ExamAssignmentNotFoundError();
    }

    return assignment;
  }
}
