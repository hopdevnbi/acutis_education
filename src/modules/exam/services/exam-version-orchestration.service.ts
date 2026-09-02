import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExamPublishValidationError } from '../errors/exam.errors';
import type { ExamVersionSnapshot } from '../interfaces/exam.interface';
import { ExamService } from './exam.service';

@Injectable()
export class ExamVersionOrchestrationService {
  constructor(
    private readonly examService: ExamService,
    private readonly dataSource: DataSource,
  ) {}

  async publishVersion(versionId: string, publishedByUserId: string): Promise<ExamVersionSnapshot> {
    const issues = await this.examService.collectPublishValidationIssues(versionId);

    if (issues.length > 0) {
      throw new ExamPublishValidationError(issues);
    }

    return this.dataSource.transaction(async (entityManager) =>
      this.examService.publishDraftVersionTransaction(versionId, publishedByUserId, entityManager),
    );
  }

  async cloneVersionToDraft(sourceVersionId: string): Promise<ExamVersionSnapshot> {
    return this.dataSource.transaction(async (entityManager) =>
      this.examService.cloneVersionStructureTransaction(sourceVersionId, entityManager),
    );
  }
}
