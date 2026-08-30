import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UserAccountService } from '../../users/services/user-account.service';
import { ClassCatechistAssignmentEntity } from '../entities/class-catechist-assignment.entity';
import { CatechistAssignmentRole } from '../enums/catechist-assignment-role.enum';
import { CatechistAssignmentStatus } from '../enums/catechist-assignment-status.enum';
import {
  CatechistAssignmentAlreadyActiveError,
  CatechistAssignmentNotFoundError,
  CatechistNotAssignedToClassError,
  CatechistUserInactiveError,
  CatechistUserNotFoundError,
  InvalidCatechistAssignmentIdError,
  InvalidCatechistAssignmentRoleError,
  InvalidCatechistAssignmentStatusTransitionError,
  InvalidCatechistUserIdError,
} from '../errors/class-catechist-assignment.errors';
import { ClassNotFoundError } from '../errors/class.errors';
import type {
  AssignCatechistInput,
  CatechistAssignmentSnapshot,
  ListCatechistAssignmentsInput,
  ListCatechistAssignmentsResult,
} from '../interfaces/class-catechist-assignment.interface';
import { toCatechistAssignmentSnapshot } from '../mappers/class-catechist-assignment.mapper';
import { ClassService } from './class.service';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class ClassCatechistAssignmentService {
  constructor(
    @InjectRepository(ClassCatechistAssignmentEntity)
    private readonly assignmentRepository: Repository<ClassCatechistAssignmentEntity>,
    private readonly classService: ClassService,
    private readonly userAccountService: UserAccountService,
  ) {}

  async assignCatechist(
    rawClassId: string,
    input: AssignCatechistInput,
  ): Promise<CatechistAssignmentSnapshot> {
    await this.classService.getClassById(rawClassId);
    const classId = this.parseClassId(rawClassId);
    const catechistUserId = this.parseCatechistUserId(input.catechistUserId);
    await this.assertCatechistUserEligible(catechistUserId);
    this.assertSupportedAssignmentRole(input.assignmentRole);

    const assignment = this.assignmentRepository.create({
      classId,
      catechistUserId,
      assignmentRole: input.assignmentRole,
      status: CatechistAssignmentStatus.Active,
      assignedAt: new Date(),
      endedAt: null,
    });

    try {
      const savedAssignment = await this.assignmentRepository.save(assignment);

      return toCatechistAssignmentSnapshot(savedAssignment);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new CatechistAssignmentAlreadyActiveError();
      }

      throw error;
    }
  }

  async listAssignmentsByClass(
    rawClassId: string,
    input: ListCatechistAssignmentsInput,
  ): Promise<ListCatechistAssignmentsResult> {
    await this.classService.getClassById(rawClassId);
    const classId = this.parseClassId(rawClassId);

    const countQueryBuilder = this.assignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.classId = :classId', { classId });

    if (!input.includeEnded) {
      countQueryBuilder.andWhere('assignment.status = :status', {
        status: CatechistAssignmentStatus.Active,
      });
    }

    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.assignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.classId = :classId', { classId });

    if (!input.includeEnded) {
      dataQueryBuilder.andWhere('assignment.status = :status', {
        status: CatechistAssignmentStatus.Active,
      });
    }

    dataQueryBuilder.orderBy('assignment.assignedAt', 'DESC');
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const assignments = await dataQueryBuilder.getMany();

    return {
      items: assignments.map(toCatechistAssignmentSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async getAssignmentById(rawAssignmentId: string): Promise<CatechistAssignmentSnapshot> {
    const assignment = await this.findAssignmentEntity(rawAssignmentId);

    return toCatechistAssignmentSnapshot(assignment);
  }

  async updateAssignmentStatus(
    rawAssignmentId: string,
    status: CatechistAssignmentStatus,
  ): Promise<CatechistAssignmentSnapshot> {
    if (status !== CatechistAssignmentStatus.Ended) {
      throw new InvalidCatechistAssignmentStatusTransitionError();
    }

    const assignment = await this.findAssignmentEntity(rawAssignmentId);

    if (assignment.status === CatechistAssignmentStatus.Ended) {
      throw new InvalidCatechistAssignmentStatusTransitionError();
    }

    assignment.status = CatechistAssignmentStatus.Ended;
    assignment.endedAt = new Date();

    const savedAssignment = await this.assignmentRepository.save(assignment);

    return toCatechistAssignmentSnapshot(savedAssignment);
  }

  async assertCatechistAssigned(
    rawCatechistUserId: string,
    rawClassId: string,
  ): Promise<CatechistAssignmentSnapshot> {
    const catechistUserId = this.parseCatechistUserId(rawCatechistUserId);
    const classId = this.parseClassId(rawClassId);

    const assignment = await this.assignmentRepository.findOne({
      where: {
        catechistUserId,
        classId,
        status: CatechistAssignmentStatus.Active,
      },
    });

    if (assignment === null) {
      throw new CatechistNotAssignedToClassError();
    }

    return toCatechistAssignmentSnapshot(assignment);
  }

  async hasActiveAssignmentInParish(
    rawCatechistUserId: string,
    rawParishId: string,
  ): Promise<boolean> {
    if (!isUuidV4(rawCatechistUserId) || !isUuidV4(rawParishId)) {
      return false;
    }

    const catechistUserId = normalizeUuid(rawCatechistUserId);
    const parishId = normalizeUuid(rawParishId);
    const count = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('classes', 'classEntity', 'classEntity.id = assignment.class_id')
      .where('assignment.catechistUserId = :catechistUserId', { catechistUserId })
      .andWhere('assignment.status = :status', { status: CatechistAssignmentStatus.Active })
      .andWhere('classEntity.parish_id = :parishId', { parishId })
      .getCount();

    return count > 0;
  }

  async listAssignedClassIds(rawCatechistUserId: string): Promise<string[]> {
    if (!isUuidV4(rawCatechistUserId)) {
      return [];
    }

    const catechistUserId = normalizeUuid(rawCatechistUserId);
    const assignments = await this.assignmentRepository.find({
      where: {
        catechistUserId,
        status: CatechistAssignmentStatus.Active,
      },
    });

    return assignments.map((assignment) => normalizeUuid(assignment.classId));
  }

  private async assertCatechistUserEligible(catechistUserId: string): Promise<void> {
    const accountSnapshot = await this.userAccountService.getAccountSnapshotById(catechistUserId);

    if (accountSnapshot === null) {
      throw new CatechistUserNotFoundError();
    }

    if (accountSnapshot.status !== UserStatus.Active) {
      throw new CatechistUserInactiveError();
    }
  }

  private assertSupportedAssignmentRole(role: CatechistAssignmentRole): void {
    if (role !== CatechistAssignmentRole.Lead) {
      throw new InvalidCatechistAssignmentRoleError();
    }
  }

  private async findAssignmentEntity(
    rawAssignmentId: string,
  ): Promise<ClassCatechistAssignmentEntity> {
    const assignmentId = this.parseAssignmentId(rawAssignmentId);
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (assignment === null) {
      throw new CatechistAssignmentNotFoundError();
    }

    return assignment;
  }

  private parseClassId(rawClassId: string): string {
    if (!isUuidV4(rawClassId)) {
      throw new ClassNotFoundError();
    }

    return normalizeUuid(rawClassId);
  }

  private parseCatechistUserId(rawCatechistUserId: string): string {
    if (!isUuidV4(rawCatechistUserId)) {
      throw new InvalidCatechistUserIdError();
    }

    return normalizeUuid(rawCatechistUserId);
  }

  private parseAssignmentId(rawAssignmentId: string): string {
    if (!isUuidV4(rawAssignmentId)) {
      throw new InvalidCatechistAssignmentIdError();
    }

    return normalizeUuid(rawAssignmentId);
  }
}
