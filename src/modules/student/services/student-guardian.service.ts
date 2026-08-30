import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UserAccountService } from '../../users/services/user-account.service';
import { StudentGuardianEntity } from '../entities/student-guardian.entity';
import { GuardianLinkStatus } from '../enums/guardian-link-status.enum';
import {
  GuardianLinkAlreadyActiveError,
  GuardianLinkNotFoundError,
  GuardianNotLinkedToStudentError,
  GuardianPrimaryAlreadyAssignedError,
  GuardianUserInactiveError,
  GuardianUserNotFoundError,
  InvalidGuardianLinkIdError,
  InvalidGuardianLinkStatusTransitionError,
  InvalidGuardianUserIdError,
} from '../errors/student-guardian.errors';
import { StudentNotFoundError } from '../errors/student.errors';
import type {
  GuardianLinkSnapshot,
  LinkGuardianInput,
  ListGuardianLinksInput,
  ListGuardianLinksResult,
} from '../interfaces/student-guardian.interface';
import { toGuardianLinkSnapshot } from '../mappers/student-guardian.mapper';
import { StudentService } from './student.service';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

@Injectable()
export class StudentGuardianService {
  constructor(
    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepository: Repository<StudentGuardianEntity>,
    private readonly studentService: StudentService,
    private readonly userAccountService: UserAccountService,
    private readonly dataSource: DataSource,
  ) {}

  async linkGuardian(
    rawStudentId: string,
    input: LinkGuardianInput,
  ): Promise<GuardianLinkSnapshot> {
    await this.studentService.getStudentById(rawStudentId);
    const studentId = this.parseStudentId(rawStudentId);
    const guardianUserId = this.parseGuardianUserId(input.guardianUserId);
    await this.assertGuardianUserEligible(guardianUserId);

    return this.dataSource.transaction(async (entityManager) => {
      const guardianRepository = entityManager.getRepository(StudentGuardianEntity);

      if (input.isPrimary) {
        const existingPrimary = await guardianRepository.findOne({
          where: {
            studentId,
            status: GuardianLinkStatus.Active,
            isPrimary: true,
          },
        });

        if (existingPrimary !== null) {
          throw new GuardianPrimaryAlreadyAssignedError();
        }
      }

      const guardianLink = guardianRepository.create({
        studentId,
        guardianUserId,
        relationshipType: input.relationshipType,
        isPrimary: input.isPrimary,
        status: GuardianLinkStatus.Active,
        startsAt: new Date(),
        endsAt: null,
      });

      try {
        const savedLink = await guardianRepository.save(guardianLink);

        return toGuardianLinkSnapshot(savedLink);
      } catch (error: unknown) {
        if (isUniqueConstraintViolation(error)) {
          throw new GuardianLinkAlreadyActiveError();
        }

        throw error;
      }
    });
  }

  async listGuardiansByStudent(
    rawStudentId: string,
    input: ListGuardianLinksInput,
  ): Promise<ListGuardianLinksResult> {
    await this.studentService.getStudentById(rawStudentId);
    const studentId = this.parseStudentId(rawStudentId);

    const countQueryBuilder = this.studentGuardianRepository
      .createQueryBuilder('guardianLink')
      .where('guardianLink.studentId = :studentId', { studentId });

    if (!input.includeEnded) {
      countQueryBuilder.andWhere('guardianLink.status = :status', {
        status: GuardianLinkStatus.Active,
      });
    }

    const total = await countQueryBuilder.getCount();

    const dataQueryBuilder = this.studentGuardianRepository
      .createQueryBuilder('guardianLink')
      .where('guardianLink.studentId = :studentId', { studentId });

    if (!input.includeEnded) {
      dataQueryBuilder.andWhere('guardianLink.status = :status', {
        status: GuardianLinkStatus.Active,
      });
    }

    dataQueryBuilder.orderBy('guardianLink.startsAt', 'DESC');
    dataQueryBuilder.skip((input.page - 1) * input.limit);
    dataQueryBuilder.take(input.limit);

    const guardianLinks = await dataQueryBuilder.getMany();

    return {
      items: guardianLinks.map(toGuardianLinkSnapshot),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    };
  }

  async updateGuardianLinkStatus(
    rawGuardianLinkId: string,
    status: GuardianLinkStatus,
  ): Promise<GuardianLinkSnapshot> {
    if (status !== GuardianLinkStatus.Ended) {
      throw new InvalidGuardianLinkStatusTransitionError();
    }

    const guardianLink = await this.findGuardianLinkEntity(rawGuardianLinkId);

    if (guardianLink.status === GuardianLinkStatus.Ended) {
      throw new InvalidGuardianLinkStatusTransitionError();
    }

    guardianLink.status = GuardianLinkStatus.Ended;
    guardianLink.endsAt = new Date();
    guardianLink.isPrimary = false;

    const savedLink = await this.studentGuardianRepository.save(guardianLink);

    return toGuardianLinkSnapshot(savedLink);
  }

  async assertGuardianLinked(
    rawGuardianUserId: string,
    rawStudentId: string,
  ): Promise<GuardianLinkSnapshot> {
    const guardianUserId = this.parseGuardianUserId(rawGuardianUserId);
    const studentId = this.parseStudentId(rawStudentId);

    const guardianLink = await this.studentGuardianRepository.findOne({
      where: {
        guardianUserId,
        studentId,
        status: GuardianLinkStatus.Active,
      },
    });

    if (guardianLink === null) {
      throw new GuardianNotLinkedToStudentError();
    }

    return toGuardianLinkSnapshot(guardianLink);
  }

  private async assertGuardianUserEligible(guardianUserId: string): Promise<void> {
    const accountSnapshot = await this.userAccountService.getAccountSnapshotById(guardianUserId);

    if (accountSnapshot === null) {
      throw new GuardianUserNotFoundError();
    }

    if (accountSnapshot.status !== UserStatus.Active) {
      throw new GuardianUserInactiveError();
    }
  }

  private async findGuardianLinkEntity(rawGuardianLinkId: string): Promise<StudentGuardianEntity> {
    const guardianLinkId = this.parseGuardianLinkId(rawGuardianLinkId);
    const guardianLink = await this.studentGuardianRepository.findOne({
      where: { id: guardianLinkId },
    });

    if (guardianLink === null) {
      throw new GuardianLinkNotFoundError();
    }

    return guardianLink;
  }

  private parseStudentId(rawStudentId: string): string {
    if (!isUuidV4(rawStudentId)) {
      throw new StudentNotFoundError();
    }

    return normalizeUuid(rawStudentId);
  }

  private parseGuardianUserId(rawGuardianUserId: string): string {
    if (!isUuidV4(rawGuardianUserId)) {
      throw new InvalidGuardianUserIdError();
    }

    return normalizeUuid(rawGuardianUserId);
  }

  private parseGuardianLinkId(rawGuardianLinkId: string): string {
    if (!isUuidV4(rawGuardianLinkId)) {
      throw new InvalidGuardianLinkIdError();
    }

    return normalizeUuid(rawGuardianLinkId);
  }
}
