import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { parseSourceLocale } from '../../curriculum/utils/curriculum-source-locale.util';
import { InvalidCurriculumSourceLocaleError } from '../../curriculum/errors/curriculum.errors';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { MediaCategory } from '../../media/enums/media-category.enum';
import {
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { ParishService } from '../../parish/services/parish.service';
import {
  MAX_IMPORT_CURRICULUM_LINKS,
  MAX_IMPORT_TAGS,
  QUESTION_EXPORT_SCHEMA_VERSION,
} from '../constants/question-import.constants';
import { MAX_OPTIONS, MIN_OPTIONS } from '../constants/question-option.constants';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionTagEntity } from '../entities/question-tag.entity';
import { QuestionType } from '../enums/question-type.enum';
import type {
  ImportValidationIssue,
  QuestionImportValidationResult,
} from '../errors/question-bank.errors';
import type { QuestionExportPackageV1Snapshot } from '../interfaces/question-bank.interface';
import { parseQuestionCode } from '../utils/question-code.util';
import {
  collectQuestionMediaJsonValidationIssues,
  parseOptionalQuestionMediaJson,
} from '../utils/question-media-json.util';
import { parseQuestionPrompt } from '../utils/question-text.util';
import { parseQuestionTagCode } from '../utils/question-tag-code.util';

@Injectable()
export class QuestionImportValidationService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(QuestionTagEntity)
    private readonly questionTagRepository: Repository<QuestionTagEntity>,
    private readonly parishService: ParishService,
    private readonly curriculumService: CurriculumService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  async validate(
    rawParishId: string,
    input: QuestionExportPackageV1Snapshot,
  ): Promise<QuestionImportValidationResult> {
    const parishSnapshot = await this.parishService.getParishById(rawParishId);
    const issues: ImportValidationIssue[] = [];

    if (input.schemaVersion !== QUESTION_EXPORT_SCHEMA_VERSION) {
      issues.push({
        code: 'UNSUPPORTED_SCHEMA_VERSION',
        path: 'schemaVersion',
        message: `Unsupported export schema version "${input.schemaVersion}".`,
        severity: 'ERROR',
      });
    }

    if (!Object.values(QuestionType).includes(input.questionType)) {
      issues.push({
        code: 'UNSUPPORTED_QUESTION_TYPE',
        path: 'questionType',
        message: `Unsupported question type "${input.questionType}".`,
        severity: 'ERROR',
      });
    }

    try {
      parseSourceLocale(input.sourceLocale);
    } catch (error: unknown) {
      if (error instanceof InvalidCurriculumSourceLocaleError) {
        issues.push({
          code: 'INVALID_SOURCE_LOCALE',
          path: 'sourceLocale',
          message: 'Invalid source locale.',
          severity: 'ERROR',
        });
      } else {
        throw error;
      }
    }

    try {
      parseQuestionPrompt(input.prompt);
    } catch {
      issues.push({
        code: 'PROMPT_REQUIRED',
        path: 'prompt',
        message: 'Question prompt is required.',
        severity: 'ERROR',
      });
    }

    if (input.options.length < MIN_OPTIONS || input.options.length > MAX_OPTIONS) {
      issues.push({
        code: 'INVALID_OPTION_COUNT',
        path: 'options',
        message: `Question must have between ${MIN_OPTIONS} and ${MAX_OPTIONS} options.`,
        severity: 'ERROR',
      });
    }

    if (input.tagCodes.length > MAX_IMPORT_TAGS) {
      issues.push({
        code: 'INVALID_OPTION_COUNT',
        path: 'tagCodes',
        message: `Tag list exceeds maximum of ${MAX_IMPORT_TAGS}.`,
        severity: 'ERROR',
      });
    }

    if (input.curriculumLinks.length > MAX_IMPORT_CURRICULUM_LINKS) {
      issues.push({
        code: 'INVALID_OPTION_COUNT',
        path: 'curriculumLinks',
        message: `Curriculum link list exceeds maximum of ${MAX_IMPORT_CURRICULUM_LINKS}.`,
        severity: 'ERROR',
      });
    }

    const seenExportKeys = new Set<string>();

    for (const [index, option] of input.options.entries()) {
      if (seenExportKeys.has(option.exportKey)) {
        issues.push({
          code: 'DUPLICATE_OPTION_EXPORT_KEY',
          path: `options/${index}/exportKey`,
          message: `Duplicate option export key "${option.exportKey}".`,
          severity: 'ERROR',
        });
      } else {
        seenExportKeys.add(option.exportKey);
      }

      if (option.mediaAssetId !== null) {
        const mediaIssues = await this.collectMediaIssues(
          option.mediaAssetId,
          `options/${index}/mediaAssetId`,
        );
        issues.push(...mediaIssues);
      }
    }

    for (const [index, correctKey] of input.correctOptionKeys.entries()) {
      if (!seenExportKeys.has(correctKey)) {
        issues.push({
          code: 'CORRECT_OPTION_KEY_NOT_FOUND',
          path: `correctOptionKeys/${index}`,
          message: `Correct option key "${correctKey}" was not found in options.`,
          severity: 'ERROR',
        });
      }
    }

    if (input.sourceQuestionCode !== null && input.sourceQuestionCode.trim().length > 0) {
      try {
        const normalizedCode = parseQuestionCode(input.sourceQuestionCode);
        const existingQuestion = await this.questionRepository
          .createQueryBuilder('question')
          .where('question.parishId = :parishId', { parishId: parishSnapshot.id })
          .andWhere('question.code = :code', { code: normalizedCode })
          .getOne();

        if (existingQuestion !== null) {
          issues.push({
            code: 'QUESTION_CODE_CONFLICT',
            path: 'sourceQuestionCode',
            message: `Question code "${normalizedCode}" already exists in this parish.`,
            severity: 'ERROR',
          });
        }
      } catch {
        issues.push({
          code: 'QUESTION_CODE_CONFLICT',
          path: 'sourceQuestionCode',
          message: 'Invalid question code format.',
          severity: 'ERROR',
        });
      }
    }

    for (const [index, tagCode] of input.tagCodes.entries()) {
      try {
        const normalizedTagCode = parseQuestionTagCode(tagCode);
        const tag = await this.questionTagRepository.findOne({
          where: {
            parishId: parishSnapshot.id,
            code: normalizedTagCode,
          },
        });

        if (tag === null) {
          issues.push({
            code: 'TAG_NOT_FOUND',
            path: `tagCodes/${index}`,
            message: `Tag code "${normalizedTagCode}" was not found in this parish.`,
            severity: 'ERROR',
          });
        }
      } catch {
        issues.push({
          code: 'TAG_NOT_FOUND',
          path: `tagCodes/${index}`,
          message: 'Invalid tag code format.',
          severity: 'ERROR',
        });
      }
    }

    for (const [index, link] of input.curriculumLinks.entries()) {
      if (!isUuidV4(link.curriculumId)) {
        issues.push({
          code: 'CURRICULUM_NOT_FOUND',
          path: `curriculumLinks/${index}/curriculumId`,
          message: 'Invalid curriculum id.',
          severity: 'ERROR',
        });
        continue;
      }

      try {
        const curriculum = await this.curriculumService.getCurriculumById(link.curriculumId);

        if (normalizeUuid(curriculum.parishId) !== normalizeUuid(parishSnapshot.id)) {
          issues.push({
            code: 'CURRICULUM_NOT_FOUND',
            path: `curriculumLinks/${index}/curriculumId`,
            message: 'Curriculum does not belong to this parish.',
            severity: 'ERROR',
          });
          continue;
        }

        if (link.canonicalLessonKey !== null) {
          if (!isUuidV4(link.canonicalLessonKey)) {
            issues.push({
              code: 'CANONICAL_LESSON_NOT_FOUND',
              path: `curriculumLinks/${index}/canonicalLessonKey`,
              message: 'Invalid canonical lesson key.',
              severity: 'ERROR',
            });
          } else {
            try {
              await this.curriculumService.assertCanonicalLessonKeyBelongsToCurriculum(
                link.curriculumId,
                link.canonicalLessonKey,
              );
            } catch {
              issues.push({
                code: 'CANONICAL_LESSON_NOT_FOUND',
                path: `curriculumLinks/${index}/canonicalLessonKey`,
                message: 'Canonical lesson key does not belong to the curriculum.',
                severity: 'ERROR',
              });
            }
          }
        }
      } catch {
        issues.push({
          code: 'CURRICULUM_NOT_FOUND',
          path: `curriculumLinks/${index}/curriculumId`,
          message: 'Curriculum was not found.',
          severity: 'ERROR',
        });
      }
    }

    const promptMediaIssues = await this.collectMediaJsonIssues(
      input.promptMediaJson,
      'promptMediaJson',
    );
    issues.push(...promptMediaIssues);

    const explanationMediaIssues = await this.collectMediaJsonIssues(
      input.explanationMediaJson,
      'explanationMediaJson',
    );
    issues.push(...explanationMediaIssues);

    const hasErrors = issues.some((issue) => issue.severity === 'ERROR');

    return {
      valid: !hasErrors,
      issues,
      normalizedPreview: hasErrors ? undefined : this.buildNormalizedPreview(input),
    };
  }

  private buildNormalizedPreview(
    input: QuestionExportPackageV1Snapshot,
  ): QuestionExportPackageV1Snapshot {
    return {
      schemaVersion: QUESTION_EXPORT_SCHEMA_VERSION,
      sourceQuestionCode:
        input.sourceQuestionCode === null ? null : parseQuestionCode(input.sourceQuestionCode),
      sourceLocale: parseSourceLocale(input.sourceLocale),
      versionNumber: input.versionNumber,
      questionType: input.questionType,
      prompt: parseQuestionPrompt(input.prompt),
      instruction: input.instruction,
      explanation: input.explanation,
      difficulty: input.difficulty,
      promptMediaJson: parseOptionalQuestionMediaJson(input.promptMediaJson),
      explanationMediaJson: parseOptionalQuestionMediaJson(input.explanationMediaJson),
      options: input.options.map((option) => ({
        exportKey: option.exportKey.trim(),
        code: option.code,
        text: option.text,
        mediaAssetId: option.mediaAssetId === null ? null : normalizeUuid(option.mediaAssetId),
      })),
      correctOptionKeys: [...input.correctOptionKeys],
      tagCodes: input.tagCodes.map((tagCode) => parseQuestionTagCode(tagCode)),
      curriculumLinks: input.curriculumLinks.map((link) => ({
        curriculumId: normalizeUuid(link.curriculumId),
        canonicalLessonKey:
          link.canonicalLessonKey === null ? null : normalizeUuid(link.canonicalLessonKey),
      })),
    };
  }

  private async collectMediaJsonIssues(
    rawMediaJson: string | null,
    pathPrefix: string,
  ): Promise<ImportValidationIssue[]> {
    if (rawMediaJson === null || rawMediaJson.trim().length === 0) {
      return [];
    }

    try {
      parseOptionalQuestionMediaJson(rawMediaJson);
    } catch {
      return [
        {
          code: 'MEDIA_ASSET_NOT_FOUND',
          path: pathPrefix,
          message: 'Question media JSON is invalid.',
          severity: 'ERROR',
        },
      ];
    }

    const mediaIssues = await collectQuestionMediaJsonValidationIssues(
      rawMediaJson,
      this.mediaAssetService,
      pathPrefix,
    );

    return mediaIssues.map((issue) => ({
      code: this.mapMediaIssueCode(issue.code),
      path: issue.path,
      message: issue.message,
      severity: 'ERROR' as const,
    }));
  }

  private async collectMediaIssues(
    assetId: string,
    path: string,
  ): Promise<ImportValidationIssue[]> {
    try {
      await this.mediaAssetService.assertAssetCategory(assetId, MediaCategory.Image);
      return [];
    } catch (error: unknown) {
      if (error instanceof MediaAssetNotFoundError) {
        return [
          {
            code: 'MEDIA_ASSET_NOT_FOUND',
            path,
            message: 'Referenced media asset was not found.',
            severity: 'ERROR',
          },
        ];
      }

      if (error instanceof MediaAssetNotReadyError) {
        return [
          {
            code: 'MEDIA_ASSET_NOT_READY',
            path,
            message: 'Referenced media asset is not ready.',
            severity: 'ERROR',
          },
        ];
      }

      if (error instanceof MediaAssetCategoryMismatchError) {
        return [
          {
            code: 'MEDIA_ASSET_CATEGORY_MISMATCH',
            path,
            message: 'Referenced media asset category does not match the expected image type.',
            severity: 'ERROR',
          },
        ];
      }

      throw error;
    }
  }

  private mapMediaIssueCode(
    code: 'ASSET_NOT_FOUND' | 'ASSET_NOT_READY' | 'ASSET_CATEGORY_MISMATCH',
  ): string {
    switch (code) {
      case 'ASSET_NOT_FOUND':
        return 'MEDIA_ASSET_NOT_FOUND';
      case 'ASSET_NOT_READY':
        return 'MEDIA_ASSET_NOT_READY';
      case 'ASSET_CATEGORY_MISMATCH':
        return 'MEDIA_ASSET_CATEGORY_MISMATCH';
      default:
        return code;
    }
  }
}
