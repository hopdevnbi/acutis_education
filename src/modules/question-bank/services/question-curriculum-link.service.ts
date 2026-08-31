import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { isUniqueConstraintViolation } from '../../academic-structure/utils/unique-constraint.util';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { QuestionCurriculumLinkEntity } from '../entities/question-curriculum-link.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionStatus } from '../enums/question-status.enum';
import {
  InvalidQuestionCurriculumLinkIdError,
  InvalidQuestionCurriculumLinkInputError,
  InvalidQuestionIdError,
  QuestionCurriculumLinkAlreadyExistsError,
  QuestionCurriculumLinkNotFoundError,
  QuestionCurriculumParishMismatchError,
  QuestionInactiveError,
  QuestionNotFoundError,
} from '../errors/question-bank.errors';
import type {
  CreateQuestionCurriculumLinkInput,
  QuestionCurriculumLinkSnapshot,
} from '../interfaces/question-bank.interface';
import { toQuestionCurriculumLinkSnapshot } from '../mappers/question-bank.mapper';

@Injectable()
export class QuestionCurriculumLinkService {
  constructor(
    @InjectRepository(QuestionCurriculumLinkEntity)
    private readonly questionCurriculumLinkRepository: Repository<QuestionCurriculumLinkEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    private readonly curriculumService: CurriculumService,
  ) {}

  async createLink(
    rawQuestionId: string,
    input: CreateQuestionCurriculumLinkInput,
  ): Promise<QuestionCurriculumLinkSnapshot> {
    const question = await this.findQuestionEntity(rawQuestionId);
    this.assertQuestionActive(question);

    if (!isUuidV4(input.curriculumId)) {
      throw new InvalidQuestionCurriculumLinkInputError();
    }

    const curriculumId = normalizeUuid(input.curriculumId);
    const curriculum = await this.curriculumService.getCurriculumById(curriculumId);

    if (normalizeUuid(curriculum.parishId) !== normalizeUuid(question.parishId)) {
      throw new QuestionCurriculumParishMismatchError();
    }

    await this.curriculumService.assertCurriculumActiveById(curriculumId);

    const canonicalLessonKey = this.parseCanonicalLessonKey(input.canonicalLessonKey);

    if (canonicalLessonKey !== null) {
      await this.curriculumService.assertCanonicalLessonKeyBelongsToCurriculum(
        curriculumId,
        canonicalLessonKey,
      );
    }

    const authoringCurriculumVersionId = this.parseAuthoringCurriculumVersionId(
      input.authoringCurriculumVersionId,
    );

    if (authoringCurriculumVersionId !== null) {
      await this.curriculumService.assertVersionBelongsToCurriculum(
        authoringCurriculumVersionId,
        curriculumId,
      );
    }

    await this.assertLinkDoesNotExist(question.id, curriculumId, canonicalLessonKey);

    const link = this.questionCurriculumLinkRepository.create({
      questionId: question.id,
      parishId: question.parishId,
      curriculumId,
      canonicalLessonKey,
      authoringCurriculumVersionId,
    });

    try {
      const savedLink = await this.questionCurriculumLinkRepository.save(link);

      return toQuestionCurriculumLinkSnapshot(savedLink);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new QuestionCurriculumLinkAlreadyExistsError();
      }

      throw error;
    }
  }

  async listLinksByQuestion(rawQuestionId: string): Promise<QuestionCurriculumLinkSnapshot[]> {
    const questionId = this.parseQuestionId(rawQuestionId);
    await this.findQuestionEntity(questionId);

    const links = await this.questionCurriculumLinkRepository.find({
      where: { questionId },
      order: { createdAt: 'ASC' },
    });

    return links.map(toQuestionCurriculumLinkSnapshot);
  }

  async deleteLink(rawLinkId: string): Promise<void> {
    const linkId = this.parseLinkId(rawLinkId);
    const result = await this.questionCurriculumLinkRepository.delete({ id: linkId });

    if (result.affected === 0) {
      throw new QuestionCurriculumLinkNotFoundError();
    }
  }

  async getLinkById(rawLinkId: string): Promise<QuestionCurriculumLinkSnapshot> {
    const link = await this.findLinkEntity(rawLinkId);

    return toQuestionCurriculumLinkSnapshot(link);
  }

  private async assertLinkDoesNotExist(
    questionId: string,
    curriculumId: string,
    canonicalLessonKey: string | null,
  ): Promise<void> {
    const existingLink = await this.questionCurriculumLinkRepository.findOne({
      where: {
        questionId,
        curriculumId,
        canonicalLessonKey: canonicalLessonKey === null ? IsNull() : canonicalLessonKey,
      },
    });

    if (existingLink !== null) {
      throw new QuestionCurriculumLinkAlreadyExistsError();
    }
  }

  private parseCanonicalLessonKey(rawCanonicalLessonKey: string | null | undefined): string | null {
    if (rawCanonicalLessonKey === undefined || rawCanonicalLessonKey === null) {
      return null;
    }

    if (!isUuidV4(rawCanonicalLessonKey)) {
      throw new InvalidQuestionCurriculumLinkInputError();
    }

    return normalizeUuid(rawCanonicalLessonKey);
  }

  private parseAuthoringCurriculumVersionId(
    rawVersionId: string | null | undefined,
  ): string | null {
    if (rawVersionId === undefined || rawVersionId === null) {
      return null;
    }

    if (!isUuidV4(rawVersionId)) {
      throw new InvalidQuestionCurriculumLinkInputError();
    }

    return normalizeUuid(rawVersionId);
  }

  private assertQuestionActive(question: QuestionEntity): void {
    if (question.status !== QuestionStatus.Active) {
      throw new QuestionInactiveError();
    }
  }

  private async findQuestionEntity(rawQuestionId: string): Promise<QuestionEntity> {
    const questionId = this.parseQuestionId(rawQuestionId);
    const question = await this.questionRepository.findOne({ where: { id: questionId } });

    if (question === null) {
      throw new QuestionNotFoundError();
    }

    return question;
  }

  private async findLinkEntity(rawLinkId: string): Promise<QuestionCurriculumLinkEntity> {
    const linkId = this.parseLinkId(rawLinkId);
    const link = await this.questionCurriculumLinkRepository.findOne({ where: { id: linkId } });

    if (link === null) {
      throw new QuestionCurriculumLinkNotFoundError();
    }

    return link;
  }

  private parseQuestionId(rawQuestionId: string): string {
    if (!isUuidV4(rawQuestionId)) {
      throw new InvalidQuestionIdError();
    }

    return normalizeUuid(rawQuestionId);
  }

  private parseLinkId(rawLinkId: string): string {
    if (!isUuidV4(rawLinkId)) {
      throw new InvalidQuestionCurriculumLinkIdError();
    }

    return normalizeUuid(rawLinkId);
  }
}
