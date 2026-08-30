import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CurriculumPublishValidationError,
  type CurriculumPublishValidationIssue,
} from '../../curriculum/errors/curriculum.errors';
import type { CurriculumVersionSnapshot } from '../../curriculum/interfaces/curriculum.interface';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { LessonService } from '../../curriculum/services/lesson.service';
import { LearningContentService } from '../../learning-content/services/learning-content.service';

@Injectable()
export class CurriculumVersionOrchestrationService {
  constructor(
    private readonly curriculumService: CurriculumService,
    private readonly learningContentService: LearningContentService,
    private readonly lessonService: LessonService,
    private readonly dataSource: DataSource,
  ) {}

  async publishVersion(
    versionId: string,
    publishedByUserId: string,
  ): Promise<CurriculumVersionSnapshot> {
    const issues = await this.collectPublishValidationIssues(versionId);

    if (issues.length > 0) {
      throw new CurriculumPublishValidationError(issues);
    }

    return this.dataSource.transaction(async (entityManager) =>
      this.curriculumService.publishDraftVersionTransaction(
        versionId,
        publishedByUserId,
        entityManager,
      ),
    );
  }

  async cloneVersionToDraft(
    sourceVersionId: string,
    createdByUserId: string,
  ): Promise<CurriculumVersionSnapshot> {
    return this.dataSource.transaction(async (entityManager) => {
      const { versionSnapshot, lessonIdMap } =
        await this.curriculumService.cloneVersionStructureTransaction(
          sourceVersionId,
          createdByUserId,
          entityManager,
        );

      await this.learningContentService.cloneContentForLessons(lessonIdMap, entityManager);

      return versionSnapshot;
    });
  }

  async deleteLessonWithContent(lessonId: string): Promise<void> {
    await this.dataSource.transaction(async (entityManager) => {
      await this.learningContentService.deleteByLessonId(lessonId, entityManager);
      await this.lessonService.deleteLessonStructureTransaction(lessonId, entityManager);
    });
  }

  private async collectPublishValidationIssues(
    versionId: string,
  ): Promise<CurriculumPublishValidationIssue[]> {
    const versionTree = await this.curriculumService.getVersionTree(versionId);
    const issues: CurriculumPublishValidationIssue[] = [];

    if (versionTree.topics.length === 0) {
      issues.push({
        code: 'NO_TOPICS',
        message: 'Curriculum version must contain at least one topic.',
      });
    }

    for (const topic of versionTree.topics) {
      if (topic.lessons.length === 0) {
        issues.push({
          code: 'TOPIC_WITHOUT_LESSONS',
          message: `Topic "${topic.title}" must contain at least one lesson.`,
          resourceId: topic.id,
          path: `topics/${topic.id}`,
        });
      }
    }

    const contentIssues =
      await this.learningContentService.collectPublishValidationIssues(versionId);

    for (const contentIssue of contentIssues) {
      issues.push({
        code: contentIssue.code,
        message: contentIssue.message,
        resourceId: contentIssue.lessonId,
        path: `lessons/${contentIssue.lessonId}/content`,
      });
    }

    return issues;
  }
}
