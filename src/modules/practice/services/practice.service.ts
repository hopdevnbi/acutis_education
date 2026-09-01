import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PracticeSessionEntity } from '../entities/practice-session.entity';
import { PracticeSessionStatus } from '../enums/practice-session-status.enum';
import { PracticeSessionCompletedError } from '../errors/practice.errors';
import type {
  CreatePracticeSessionInput,
  CreateReviewWrongSessionInput,
  PracticeAnswerResult,
  PracticeSessionSnapshot,
  ReviewWrongSessionResult,
  SubmitPracticeAnswerInput,
} from '../interfaces/practice.interface';
import type { MediaAssetContent } from '../../media/interfaces/media-asset.interface';
import type {
  ClassPracticeProgressSnapshot,
  EnrollmentPracticeProgressSnapshot,
  GetClassPracticeProgressInput,
  GetEnrollmentPracticeProgressInput,
} from '../interfaces/practice-progress.interface';
import { PracticeAnswerService } from './practice-answer.service';
import { PracticeGenerationService } from './practice-generation.service';
import { PracticeMediaService } from './practice-media.service';
import { PracticeAccessService } from './practice-access.service';
import { PracticeProgressService } from './practice-progress.service';
import { PracticeReviewService } from './practice-review.service';
import { PracticeSessionQueryService } from './practice-session-query.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';

@Injectable()
export class PracticeService {
  constructor(
    @InjectRepository(PracticeSessionEntity)
    private readonly practiceSessionRepository: Repository<PracticeSessionEntity>,
    private readonly enrollmentService: EnrollmentService,
    private readonly practiceAccessService: PracticeAccessService,
    private readonly practiceGenerationService: PracticeGenerationService,
    private readonly practiceAnswerService: PracticeAnswerService,
    private readonly practiceReviewService: PracticeReviewService,
    private readonly practiceSessionQueryService: PracticeSessionQueryService,
    private readonly practiceMediaService: PracticeMediaService,
    private readonly practiceProgressService: PracticeProgressService,
  ) {}

  createSession(input: CreatePracticeSessionInput): Promise<PracticeSessionSnapshot> {
    return this.practiceGenerationService.createSession(input);
  }

  async getSession(rawUserId: string, rawSessionId: string): Promise<PracticeSessionSnapshot> {
    const session = await this.practiceSessionQueryService.findSessionEntity(rawSessionId);
    const enrollment = await this.enrollmentService.getEnrollmentById(session.enrollmentId);

    await this.practiceAccessService.assertCanReadLearnerSession(rawUserId, enrollment.studentId);

    return this.practiceSessionQueryService.getSessionSnapshot(session.id);
  }

  async abandonSession(rawUserId: string, rawSessionId: string): Promise<PracticeSessionSnapshot> {
    const session = await this.practiceSessionQueryService.findSessionEntity(rawSessionId);
    const enrollment = await this.enrollmentService.getEnrollmentById(session.enrollmentId);

    await this.practiceAccessService.assertCanManageEnrollmentPractice(
      rawUserId,
      enrollment.studentId,
    );

    if (session.status === PracticeSessionStatus.Abandoned) {
      return this.practiceSessionQueryService.getSessionSnapshot(session.id);
    }

    if (session.status === PracticeSessionStatus.Completed) {
      throw new PracticeSessionCompletedError();
    }

    session.status = PracticeSessionStatus.Abandoned;
    session.abandonedAt = new Date();
    await this.practiceSessionRepository.save(session);

    return this.practiceSessionQueryService.getSessionSnapshot(session.id);
  }

  submitAnswer(input: SubmitPracticeAnswerInput): Promise<PracticeAnswerResult> {
    return this.practiceAnswerService.submitAnswer(input);
  }

  createReviewWrongSession(
    input: CreateReviewWrongSessionInput,
  ): Promise<ReviewWrongSessionResult> {
    return this.practiceReviewService.createReviewWrongSession(input);
  }

  openSessionQuestionMediaContent(
    rawUserId: string,
    rawSessionId: string,
    rawSessionQuestionId: string,
    rawAssetId: string,
  ): Promise<MediaAssetContent> {
    return this.practiceMediaService.openSessionQuestionMediaContent(
      rawUserId,
      rawSessionId,
      rawSessionQuestionId,
      rawAssetId,
    );
  }

  getEnrollmentProgress(
    input: GetEnrollmentPracticeProgressInput,
  ): Promise<EnrollmentPracticeProgressSnapshot> {
    return this.practiceProgressService.getEnrollmentProgress(input);
  }

  getClassProgress(input: GetClassPracticeProgressInput): Promise<ClassPracticeProgressSnapshot> {
    return this.practiceProgressService.getClassProgress(input);
  }
}
