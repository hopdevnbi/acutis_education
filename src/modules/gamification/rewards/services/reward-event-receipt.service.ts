import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../../database/uuid-v4.util';
import { RewardEventAlreadyProcessedError } from '../../errors/gamification.errors';
import type { ProcessedRewardEventSnapshot } from '../../interfaces/gamification.interfaces';
import { toProcessedRewardEventSnapshot } from '../../mappers/gamification.mapper';
import { ProcessedRewardEventEntity } from '../entities/processed-reward-event.entity';

export interface RecordProcessedRewardEventInput {
  readonly eventId: string;
  readonly eventType: string;
  readonly studentId: string;
  readonly sourceId: string;
  readonly processedAt?: Date;
}

@Injectable()
export class RewardEventReceiptService {
  constructor(
    @InjectRepository(ProcessedRewardEventEntity)
    private readonly receiptRepository: Repository<ProcessedRewardEventEntity>,
  ) {}

  async findByEventId(rawEventId: string): Promise<ProcessedRewardEventSnapshot | null> {
    const eventId = normalizeUuid(rawEventId);
    const row = await this.receiptRepository.findOne({ where: { eventId } });
    return row ? toProcessedRewardEventSnapshot(row) : null;
  }

  async isDuplicateEventId(rawEventId: string): Promise<boolean> {
    const existing = await this.findByEventId(rawEventId);
    return existing != null;
  }

  async recordProcessed(input: RecordProcessedRewardEventInput): Promise<ProcessedRewardEventSnapshot> {
    const entity = this.receiptRepository.create({
      eventId: normalizeUuid(input.eventId),
      eventType: input.eventType,
      studentId: normalizeUuid(input.studentId),
      sourceId: normalizeUuid(input.sourceId),
      processedAt: input.processedAt ?? new Date(),
    });

    try {
      const saved = await this.receiptRepository.save(entity);
      return toProcessedRewardEventSnapshot(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new RewardEventAlreadyProcessedError();
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    (error.message.includes('UQ_processed_reward_events_event_id') ||
      error.message.includes('unique') ||
      error.message.includes('UNIQUE'))
  );
}
