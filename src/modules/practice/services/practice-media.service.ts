import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MediaAssetContent } from '../../media/interfaces/media-asset.interface';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { PracticeAnswerAttemptEntity } from '../entities/practice-answer-attempt.entity';
import { PracticeMediaNotReferencedError } from '../errors/practice.errors';
import {
  derivePracticeQuestionAttemptState,
  type PracticeAttemptRecord,
} from '../utils/practice-attempt-state.util';
import { parseSelectedOptionIdsJson } from '../utils/practice-selected-options.util';
import { PracticeAccessService } from './practice-access.service';
import { PracticeSessionQueryService } from './practice-session-query.service';

@Injectable()
export class PracticeMediaService {
  constructor(
    @InjectRepository(PracticeAnswerAttemptEntity)
    private readonly practiceAnswerAttemptRepository: Repository<PracticeAnswerAttemptEntity>,
    private readonly enrollmentService: EnrollmentService,
    private readonly practiceSessionQueryService: PracticeSessionQueryService,
    private readonly questionBankService: QuestionBankService,
    private readonly mediaAssetService: MediaAssetService,
    private readonly practiceAccessService: PracticeAccessService,
  ) {}

  async openSessionQuestionMediaContent(
    rawUserId: string,
    rawSessionId: string,
    rawSessionQuestionId: string,
    rawAssetId: string,
  ): Promise<MediaAssetContent> {
    const session = await this.practiceSessionQueryService.findSessionEntity(rawSessionId);
    const enrollment = await this.enrollmentService.getEnrollmentById(session.enrollmentId);

    await this.practiceAccessService.assertCanReadLearnerSession(rawUserId, enrollment.studentId);

    const sessionQuestion = await this.practiceSessionQueryService.findSessionQuestionEntity(
      rawSessionId,
      rawSessionQuestionId,
    );
    const projection = await this.questionBankService.getLearnerQuestionProjection(
      sessionQuestion.questionVersionId,
    );

    const attempts = await this.practiceAnswerAttemptRepository.find({
      where: { practiceSessionQuestionId: sessionQuestion.id },
      order: { attemptNumber: 'ASC' },
    });
    const attemptRecords: PracticeAttemptRecord[] = attempts.map((attempt) => ({
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      clientAnswerId: attempt.clientAnswerId,
      selectedOptionIds: parseSelectedOptionIdsJson(attempt.selectedOptionIdsJson),
      isCorrect: attempt.isCorrect,
      score: attempt.score,
      submittedAt: attempt.submittedAt,
    }));
    const attemptState = derivePracticeQuestionAttemptState({
      attempts: attemptRecords,
      maxAttemptsPerQuestion: session.maxAttemptsPerQuestion,
      sessionStatus: session.status,
    });

    const promptOrOptionReferenced = this.questionBankService.learnerProjectionReferencesMediaAsset(
      projection,
      rawAssetId,
    );

    if (promptOrOptionReferenced) {
      await this.mediaAssetService.assertAssetReady(rawAssetId);

      return this.mediaAssetService.openAssetContent(rawAssetId);
    }

    if (attemptState.feedbackRevealed) {
      const feedback = await this.questionBankService.getPracticeFeedback(
        sessionQuestion.questionVersionId,
      );

      if (this.questionBankService.practiceFeedbackReferencesMediaAsset(feedback, rawAssetId)) {
        await this.mediaAssetService.assertAssetReady(rawAssetId);

        return this.mediaAssetService.openAssetContent(rawAssetId);
      }
    }

    throw new PracticeMediaNotReferencedError();
  }
}
