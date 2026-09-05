import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import { PointSourceType } from '../../enums/gamification.enums';
import {
  PointLedgerDuplicateIdentityError,
  PointLedgerEntryAlreadyReversedError,
  PointLedgerEntryNotFoundError,
  ZeroPointsDeltaError,
} from '../../errors/gamification.errors';
import type {
  AppendPointLedgerEntryInput,
  PointBalanceSummary,
  PointLedgerEntrySnapshot,
  PointLedgerListResult,
} from '../../interfaces/gamification.interfaces';
import { toPointLedgerEntrySnapshot } from '../../mappers/gamification.mapper';
import {
  assertNonZeroPointsDelta,
  buildReversalDelta,
  buildReversalReasonCode,
  sumLifetimePositivePoints,
  sumPointsDelta,
} from '../utils/point-ledger.util';
import { PointLedgerEntryEntity } from '../entities/point-ledger-entry.entity';

@Injectable()
export class PointLedgerService {
  constructor(
    @InjectRepository(PointLedgerEntryEntity)
    private readonly ledgerRepository: Repository<PointLedgerEntryEntity>,
  ) {}

  private repo(manager?: EntityManager): Repository<PointLedgerEntryEntity> {
    return manager ? manager.getRepository(PointLedgerEntryEntity) : this.ledgerRepository;
  }

  async append(
    input: AppendPointLedgerEntryInput,
    manager?: EntityManager,
  ): Promise<PointLedgerEntrySnapshot> {
    assertNonZeroPointsDelta(input.pointsDelta);

    const repository = this.repo(manager);
    const entity = repository.create({
      studentId: normalizeUuid(input.studentId),
      enrollmentId: input.enrollmentId ? normalizeUuid(input.enrollmentId) : null,
      parishId: normalizeUuid(input.parishId),
      academicYearId: input.academicYearId ? normalizeUuid(input.academicYearId) : null,
      pointsDelta: input.pointsDelta,
      sourceType: input.sourceType,
      sourceId: normalizeUuid(input.sourceId),
      reasonCode: input.reasonCode.trim(),
      descriptionKey: input.descriptionKey ?? null,
      staffNote: input.staffNote ?? null,
      awardedByUserId: input.awardedByUserId ? normalizeUuid(input.awardedByUserId) : null,
      relatedLedgerEntryId: input.relatedLedgerEntryId
        ? normalizeUuid(input.relatedLedgerEntryId)
        : null,
    });

    try {
      const saved = await repository.save(entity);
      return toPointLedgerEntrySnapshot(saved, { includeStaffNote: true });
    } catch (error) {
      if (isUniqueViolation(error)) {
        if (
          input.sourceType === PointSourceType.Reversal &&
          typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          String((error as { message: unknown }).message).includes(
            'UQ_point_ledger_entries_reversal_related',
          )
        ) {
          throw new PointLedgerEntryAlreadyReversedError();
        }
        throw new PointLedgerDuplicateIdentityError();
      }
      throw error;
    }
  }

  async findByIdentity(
    input: {
      readonly studentId: string;
      readonly sourceType: string;
      readonly sourceId: string;
      readonly reasonCode: string;
    },
    manager?: EntityManager,
  ): Promise<PointLedgerEntrySnapshot | null> {
    const row = await this.repo(manager).findOne({
      where: {
        studentId: normalizeUuid(input.studentId),
        sourceType: input.sourceType,
        sourceId: normalizeUuid(input.sourceId),
        reasonCode: input.reasonCode,
      },
    });
    return row ? toPointLedgerEntrySnapshot(row, { includeStaffNote: true }) : null;
  }

  async getById(rawId: string): Promise<PointLedgerEntrySnapshot> {
    const row = await this.ledgerRepository.findOne({ where: { id: normalizeUuid(rawId) } });
    if (!row) {
      throw new PointLedgerEntryNotFoundError();
    }
    return toPointLedgerEntrySnapshot(row, { includeStaffNote: true });
  }

  async findReversalForEntry(rawOriginalEntryId: string): Promise<PointLedgerEntrySnapshot | null> {
    const row = await this.ledgerRepository.findOne({
      where: {
        sourceType: PointSourceType.Reversal,
        relatedLedgerEntryId: normalizeUuid(rawOriginalEntryId),
      },
    });
    return row ? toPointLedgerEntrySnapshot(row, { includeStaffNote: true }) : null;
  }

  async getBalance(input: {
    readonly studentId: string;
    readonly parishId?: string | null;
    readonly academicYearId?: string | null;
  }): Promise<PointBalanceSummary> {
    const studentId = normalizeUuid(input.studentId);
    const qb = this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('ledger.pointsDelta', 'pointsDelta')
      .where('ledger.studentId = :studentId', { studentId });

    if (input.parishId) {
      qb.andWhere('ledger.parishId = :parishId', { parishId: normalizeUuid(input.parishId) });
    }
    if (input.academicYearId) {
      qb.andWhere('ledger.academicYearId = :academicYearId', {
        academicYearId: normalizeUuid(input.academicYearId),
      });
    }

    const rows = await qb.getRawMany<{ pointsDelta: string | number }>();
    const deltas = rows.map((row) => Number(row.pointsDelta));

    return {
      studentId,
      parishId: input.parishId ?? null,
      academicYearId: input.academicYearId ?? null,
      balance: sumPointsDelta(deltas),
      lifetimePositivePoints: sumLifetimePositivePoints(deltas),
      entryCount: deltas.length,
    };
  }

  async listByStudentId(
    rawStudentId: string,
    options: { readonly take?: number; readonly includeStaffNote?: boolean } = {},
  ): Promise<PointLedgerEntrySnapshot[]> {
    const studentId = normalizeUuid(rawStudentId);
    const take = options.take ?? 50;
    const rows = await this.ledgerRepository.find({
      where: { studentId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take,
    });
    return rows.map((row) =>
      toPointLedgerEntrySnapshot(row, { includeStaffNote: options.includeStaffNote === true }),
    );
  }

  async listByStudentIdPaginated(input: {
    readonly studentId: string;
    readonly page: number;
    readonly limit: number;
    readonly includeStaffNote?: boolean;
  }): Promise<PointLedgerListResult> {
    const studentId = normalizeUuid(input.studentId);
    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));

    const [rows, total] = await this.ledgerRepository.findAndCount({
      where: { studentId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map((row) =>
        toPointLedgerEntrySnapshot(row, { includeStaffNote: input.includeStaffNote === true }),
      ),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async reverseEntry(input: {
    readonly originalEntryId: string;
    readonly awardedByUserId?: string | null;
    readonly staffNote?: string | null;
  }): Promise<PointLedgerEntrySnapshot> {
    const originalId = normalizeUuid(input.originalEntryId);
    const existingReversal = await this.findReversalForEntry(originalId);
    if (existingReversal) {
      throw new PointLedgerEntryAlreadyReversedError();
    }

    const original = await this.ledgerRepository.findOne({ where: { id: originalId } });
    if (!original) {
      throw new PointLedgerEntryNotFoundError();
    }

    try {
      return await this.append({
        studentId: original.studentId,
        enrollmentId: original.enrollmentId,
        parishId: original.parishId,
        academicYearId: original.academicYearId,
        pointsDelta: buildReversalDelta(original.pointsDelta),
        sourceType: PointSourceType.Reversal,
        sourceId: original.id,
        reasonCode: buildReversalReasonCode(original.reasonCode),
        descriptionKey: original.descriptionKey,
        staffNote: input.staffNote ?? null,
        awardedByUserId: input.awardedByUserId ?? null,
        relatedLedgerEntryId: original.id,
      });
    } catch (error: unknown) {
      if (
        error instanceof PointLedgerDuplicateIdentityError ||
        error instanceof PointLedgerEntryAlreadyReversedError
      ) {
        throw new PointLedgerEntryAlreadyReversedError();
      }
      throw error;
    }
  }

  // Intentionally no updatePoints / setBalance / deleteEntry — append-only ledger.
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    (error.message.includes('UQ_point_ledger_entries_student_source_reason') ||
      error.message.includes('UQ_point_ledger_entries_reversal_related') ||
      error.message.includes('unique') ||
      error.message.includes('UNIQUE'))
  );
}

export { ZeroPointsDeltaError };
