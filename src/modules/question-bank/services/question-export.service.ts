import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { QUESTION_EXPORT_SCHEMA_VERSION } from '../constants/question-import.constants';
import { QuestionCorrectOptionEntity } from '../entities/question-correct-option.entity';
import { QuestionCurriculumLinkEntity } from '../entities/question-curriculum-link.entity';
import { QuestionOptionEntity } from '../entities/question-option.entity';
import { QuestionTagLinkEntity } from '../entities/question-tag-link.entity';
import { QuestionTagEntity } from '../entities/question-tag.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import {
  QuestionNotFoundError,
  QuestionVersionNotFoundError,
} from '../errors/question-bank.errors';
import type { QuestionExportPackageV1Snapshot } from '../interfaces/question-bank.interface';
import { assignOptionExportKeys } from '../utils/question-export-option-key.util';

@Injectable()
export class QuestionExportService {
  constructor(
    @InjectRepository(QuestionVersionEntity)
    private readonly questionVersionRepository: Repository<QuestionVersionEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(QuestionOptionEntity)
    private readonly questionOptionRepository: Repository<QuestionOptionEntity>,
    @InjectRepository(QuestionCorrectOptionEntity)
    private readonly questionCorrectOptionRepository: Repository<QuestionCorrectOptionEntity>,
    @InjectRepository(QuestionTagLinkEntity)
    private readonly questionTagLinkRepository: Repository<QuestionTagLinkEntity>,
    @InjectRepository(QuestionTagEntity)
    private readonly questionTagRepository: Repository<QuestionTagEntity>,
    @InjectRepository(QuestionCurriculumLinkEntity)
    private readonly questionCurriculumLinkRepository: Repository<QuestionCurriculumLinkEntity>,
  ) {}

  async buildExportPackage(rawVersionId: string): Promise<QuestionExportPackageV1Snapshot> {
    const version = await this.questionVersionRepository.findOne({
      where: { id: normalizeUuid(rawVersionId) },
    });

    if (version === null) {
      throw new QuestionVersionNotFoundError();
    }

    const question = await this.questionRepository.findOne({
      where: { id: version.questionId },
    });

    if (question === null) {
      throw new QuestionNotFoundError();
    }

    const options = await this.questionOptionRepository.find({
      where: { questionVersionId: version.id },
      order: { sortOrder: 'ASC' },
    });

    const correctOptions = await this.questionCorrectOptionRepository.find({
      where: { questionVersionId: version.id },
    });

    const { exportKeyByOptionId } = assignOptionExportKeys(
      options.map((option) => ({
        id: normalizeUuid(option.id),
        code: option.code,
        sortOrder: option.sortOrder,
      })),
    );

    const correctOptionKeys = correctOptions
      .map((correctOption) => exportKeyByOptionId.get(normalizeUuid(correctOption.optionId)))
      .filter((exportKey): exportKey is string => exportKey !== undefined);

    const tagLinks = await this.questionTagLinkRepository.find({
      where: { questionId: question.id },
    });

    const tagIds = tagLinks.map((link) => link.tagId);
    const tags =
      tagIds.length === 0
        ? []
        : await this.questionTagRepository.find({
            where: { id: In(tagIds) },
            order: { code: 'ASC' },
          });

    const curriculumLinks = await this.questionCurriculumLinkRepository.find({
      where: { questionId: question.id },
      order: { createdAt: 'ASC' },
    });

    return {
      schemaVersion: QUESTION_EXPORT_SCHEMA_VERSION,
      sourceQuestionCode: question.code,
      sourceLocale: question.sourceLocale,
      versionNumber: version.versionNumber,
      questionType: version.questionType,
      prompt: version.prompt,
      instruction: version.instruction,
      explanation: version.explanation,
      difficulty: version.difficulty,
      promptMediaJson: version.promptMediaJson,
      explanationMediaJson: version.explanationMediaJson,
      options: options.map((option) => ({
        exportKey: exportKeyByOptionId.get(normalizeUuid(option.id)) ?? `opt-${option.sortOrder}`,
        code: option.code,
        text: option.text,
        mediaAssetId: option.mediaAssetId,
      })),
      correctOptionKeys,
      tagCodes: tags.map((tag) => tag.code),
      curriculumLinks: curriculumLinks.map((link) => ({
        curriculumId: link.curriculumId,
        canonicalLessonKey: link.canonicalLessonKey,
      })),
    };
  }
}
