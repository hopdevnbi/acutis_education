import { Injectable } from '@nestjs/common';
import type { MediaAssetContent } from '../../media/interfaces/media-asset.interface';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { PracticeMediaNotReferencedError } from '../errors/practice.errors';
import { PracticeAccessService } from './practice-access.service';
import { PracticeSessionQueryService } from './practice-session-query.service';

@Injectable()
export class PracticeMediaService {
  constructor(
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

    if (!this.questionBankService.learnerProjectionReferencesMediaAsset(projection, rawAssetId)) {
      throw new PracticeMediaNotReferencedError();
    }

    await this.mediaAssetService.assertAssetReady(rawAssetId);

    return this.mediaAssetService.openAssetContent(rawAssetId);
  }
}
