import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import type { ProcessedRewardEventSnapshot } from '../../interfaces/gamification.interfaces';
import { ProcessedRewardEventEntity } from '../entities/processed-reward-event.entity';

@Injectable()
export class RewardEventHistoryService {
  constructor(
    @InjectRepository(ProcessedRewardEventEntity)
    private readonly receiptRepository: Repository<ProcessedRewardEventEntity>,
  ) {}

  private repo(manager?: EntityManager): Repository<ProcessedRewardEventEntity> {
    return manager ? manager.getRepository(ProcessedRewardEventEntity) : this.receiptRepository;
  }

  /**
   * Count Gamification-owned processed events for a student by event type.
   * Used by badge/milestone count rules — never queries source-domain tables.
   */
  async countProcessedEventsForStudentByType(
    input: {
      readonly studentId: string;
      readonly eventType: string;
      readonly parishId?: string | null;
    },
    manager?: EntityManager,
  ): Promise<number> {
    const studentId = normalizeUuid(input.studentId);
    const qb = this.repo(manager)
      .createQueryBuilder('receipt')
      .where('receipt.studentId = :studentId', { studentId })
      .andWhere('receipt.eventType = :eventType', { eventType: input.eventType });

    if (input.parishId) {
      qb.andWhere('receipt.parishId = :parishId', {
        parishId: normalizeUuid(input.parishId),
      });
    }

    return qb.getCount();
  }

  async listRecentProcessedEventsForStudent(
    input: {
      readonly studentId: string;
      readonly eventType?: string;
      readonly take?: number;
    },
    manager?: EntityManager,
  ): Promise<ProcessedRewardEventSnapshot[]> {
    const take = Math.min(100, Math.max(1, input.take ?? 20));
    const qb = this.repo(manager)
      .createQueryBuilder('receipt')
      .where('receipt.studentId = :studentId', {
        studentId: normalizeUuid(input.studentId),
      })
      .orderBy('receipt.occurredAt', 'DESC')
      .addOrderBy('receipt.id', 'DESC')
      .take(take);

    if (input.eventType) {
      qb.andWhere('receipt.eventType = :eventType', { eventType: input.eventType });
    }

    const rows = await qb.getMany();
    return rows.map((entity) => ({
      id: entity.id,
      eventId: entity.eventId,
      eventType: entity.eventType,
      studentId: entity.studentId,
      sourceId: entity.sourceId,
      parishId: entity.parishId,
      enrollmentId: entity.enrollmentId,
      occurredAt: entity.occurredAt,
      processedAt: entity.processedAt,
      createdAt: entity.createdAt,
    }));
  }
}
