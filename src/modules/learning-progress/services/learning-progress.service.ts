import { Injectable } from '@nestjs/common';
import type {
  ClassLearningProgressSnapshot,
  EnrollmentLearningProgressSnapshot,
  GetClassLearningProgressInput,
  GetEnrollmentLearningProgressInput,
  PatchLessonProgressInput,
} from '../interfaces/learning-progress.interface';
import type { LessonProgressSnapshot } from '../interfaces/lesson-progress.interface';
import { LearningProgressAggregationService } from './learning-progress-aggregation.service';
import { LessonProgressService } from './lesson-progress.service';

@Injectable()
export class LearningProgressService {
  constructor(
    private readonly lessonProgressService: LessonProgressService,
    private readonly learningProgressAggregationService: LearningProgressAggregationService,
  ) {}

  getLessonProgress(input: {
    enrollmentId: string;
    canonicalLessonKey: string;
  }): Promise<LessonProgressSnapshot> {
    return this.lessonProgressService.getLessonProgress(input);
  }

  setLessonProgress(input: {
    enrollmentId: string;
    canonicalLessonKey: string;
    targetStatus: PatchLessonProgressInput['status'];
    actorUserId: string;
  }): Promise<LessonProgressSnapshot> {
    return this.lessonProgressService.setLessonProgress(input);
  }

  patchLessonProgress(input: PatchLessonProgressInput): Promise<LessonProgressSnapshot> {
    return this.lessonProgressService.setLessonProgress({
      enrollmentId: input.enrollmentId,
      canonicalLessonKey: input.canonicalLessonKey,
      targetStatus: input.status,
      actorUserId: input.actorUserId,
    });
  }

  getEnrollmentLearningProgress(
    input: GetEnrollmentLearningProgressInput,
  ): Promise<EnrollmentLearningProgressSnapshot> {
    return this.learningProgressAggregationService.getEnrollmentLearningProgress(input);
  }

  getClassLearningProgress(
    input: GetClassLearningProgressInput,
  ): Promise<ClassLearningProgressSnapshot> {
    return this.learningProgressAggregationService.getClassLearningProgress(input);
  }
}
