import { Injectable } from '@nestjs/common';
import type {
  GetLessonProgressInput,
  LessonProgressSnapshot,
  ListEnrollmentLessonProgressInput,
  SetLessonProgressInput,
} from '../interfaces/lesson-progress.interface';
import { LessonProgressService } from './lesson-progress.service';

@Injectable()
export class LearningProgressService {
  constructor(private readonly lessonProgressService: LessonProgressService) {}

  getLessonProgress(input: GetLessonProgressInput): Promise<LessonProgressSnapshot> {
    return this.lessonProgressService.getLessonProgress(input);
  }

  setLessonProgress(input: SetLessonProgressInput): Promise<LessonProgressSnapshot> {
    return this.lessonProgressService.setLessonProgress(input);
  }

  listEnrollmentLessonProgress(
    input: ListEnrollmentLessonProgressInput,
  ): Promise<LessonProgressSnapshot[]> {
    return this.lessonProgressService.listEnrollmentLessonProgress(input);
  }
}
