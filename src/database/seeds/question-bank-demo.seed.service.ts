import { Injectable, Logger } from '@nestjs/common';
import { CurriculumService } from '../../modules/curriculum/services/curriculum.service';
import { QuestionTagCodeAlreadyExistsError } from '../../modules/question-bank/errors/question-bank.errors';
import { QuestionType } from '../../modules/question-bank/enums/question-type.enum';
import type { QuestionSnapshot } from '../../modules/question-bank/interfaces/question-bank.interface';
import { QuestionBankService } from '../../modules/question-bank/services/question-bank.service';
import { QuestionCurriculumLinkService } from '../../modules/question-bank/services/question-curriculum-link.service';
import { QuestionOptionService } from '../../modules/question-bank/services/question-option.service';
import { QuestionTagService } from '../../modules/question-bank/services/question-tag.service';
import { TRUE_FALSE_OPTION_CODE_TRUE } from '../../modules/question-bank/constants/question-option.constants';
import { ParishService } from '../../modules/parish/services/parish.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from './parish-academic.seed.constants';
import {
  QUESTION_BANK_DEMO_CURRICULUM_CODE,
  QUESTION_BANK_DEMO_QUESTIONS,
  QUESTION_BANK_DEMO_SEED_ADMIN_EMAIL,
  QUESTION_BANK_DEMO_SOURCE_LOCALE,
  QUESTION_BANK_DEMO_TAGS,
  type QuestionBankDemoSeedQuestionDefinition,
} from './question-bank-demo.seed.constants';

export class QuestionBankDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionBankDemoSeedPrerequisiteError';
  }
}

export interface QuestionBankDemoSeedSummary {
  tagsCreated: number;
  tagsExisting: number;
  questionsCreated: number;
  questionsExisting: number;
  questionsPublished: number;
  questionsAlreadyPublished: number;
  tagLinksCreated: number;
  curriculumLinksCreated: number;
}

interface DemoCurriculumContext {
  readonly curriculumId: string;
  readonly publishedVersionId: string;
  readonly canonicalLessonKey: string | null;
}

@Injectable()
export class QuestionBankDemoSeedService {
  private readonly logger = new Logger(QuestionBankDemoSeedService.name);

  constructor(
    private readonly parishService: ParishService,
    private readonly userAccountService: UserAccountService,
    private readonly curriculumService: CurriculumService,
    private readonly questionBankService: QuestionBankService,
    private readonly questionOptionService: QuestionOptionService,
    private readonly questionTagService: QuestionTagService,
    private readonly questionCurriculumLinkService: QuestionCurriculumLinkService,
  ) {}

  async run(): Promise<QuestionBankDemoSeedSummary> {
    const summary: QuestionBankDemoSeedSummary = {
      tagsCreated: 0,
      tagsExisting: 0,
      questionsCreated: 0,
      questionsExisting: 0,
      questionsPublished: 0,
      questionsAlreadyPublished: 0,
      tagLinksCreated: 0,
      curriculumLinksCreated: 0,
    };

    const parish = await this.findDemoParish();
    const adminUser = await this.requireSeedUser(
      QUESTION_BANK_DEMO_SEED_ADMIN_EMAIL,
      'npm run seed:auth-rbac',
    );
    const curriculumContext = await this.resolveCurriculumContext(parish.id);

    const tagIdsByCode = await this.ensureTags(parish.id, summary);

    for (const definition of QUESTION_BANK_DEMO_QUESTIONS) {
      await this.ensureQuestion(
        parish.id,
        adminUser.id,
        definition,
        tagIdsByCode,
        curriculumContext,
        summary,
      );
    }

    return summary;
  }

  private async findDemoParish(): Promise<Awaited<ReturnType<ParishService['getParishById']>>> {
    const parishList = await this.parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const parish = parishList.items.find(
      (item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    );

    if (parish === undefined) {
      throw new QuestionBankDemoSeedPrerequisiteError(
        `Demo parish "${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.parishService.getParishById(parish.id);
  }

  private async requireSeedUser(
    email: string,
    prerequisiteCommand: string,
  ): Promise<Awaited<ReturnType<UserAccountService['getAccountSnapshotById']>> & { id: string }> {
    const account = await this.userAccountService.findAccountSnapshotByEmail(email);

    if (account === null) {
      throw new QuestionBankDemoSeedPrerequisiteError(
        `Sample user "${email}" not found. Run ${prerequisiteCommand} first.`,
      );
    }

    return account;
  }

  private async resolveCurriculumContext(parishId: string): Promise<DemoCurriculumContext> {
    const curriculumList = await this.curriculumService.listCurriculaByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
      search: QUESTION_BANK_DEMO_CURRICULUM_CODE,
    });
    const curriculum = curriculumList.items.find(
      (item) => item.code === QUESTION_BANK_DEMO_CURRICULUM_CODE,
    );

    if (curriculum === undefined || curriculum.currentPublishedVersionId === null) {
      throw new QuestionBankDemoSeedPrerequisiteError(
        `Published demo curriculum "${QUESTION_BANK_DEMO_CURRICULUM_CODE}" not found. Run npm run seed:curriculum-demo first.`,
      );
    }

    const tree = await this.curriculumService.getVersionTree(curriculum.currentPublishedVersionId);
    const firstLesson = tree.topics[0]?.lessons[0];

    return {
      curriculumId: curriculum.id,
      publishedVersionId: curriculum.currentPublishedVersionId,
      canonicalLessonKey: firstLesson?.canonicalLessonKey ?? null,
    };
  }

  private async ensureTags(
    parishId: string,
    summary: QuestionBankDemoSeedSummary,
  ): Promise<Map<string, string>> {
    const tagIdsByCode = new Map<string, string>();

    for (const tagDefinition of QUESTION_BANK_DEMO_TAGS) {
      const existingTags = await this.questionTagService.listTagsByParish(parishId, {
        page: 1,
        limit: 10,
        sortBy: 'code',
        sort: 'ASC',
        search: tagDefinition.code,
      });
      const existingTag = existingTags.items.find((tag) => tag.code === tagDefinition.code);

      if (existingTag !== undefined) {
        tagIdsByCode.set(tagDefinition.code, existingTag.id);
        summary.tagsExisting += 1;
        this.logger.log(`Demo question tag ${tagDefinition.code} already exists.`);

        continue;
      }

      try {
        const createdTag = await this.questionTagService.createTag(parishId, {
          code: tagDefinition.code,
          name: tagDefinition.name,
        });
        tagIdsByCode.set(tagDefinition.code, createdTag.id);
        summary.tagsCreated += 1;
        this.logger.log(`Created demo question tag ${tagDefinition.code}.`);
      } catch (error: unknown) {
        if (!(error instanceof QuestionTagCodeAlreadyExistsError)) {
          throw error;
        }

        const refreshedTags = await this.questionTagService.listTagsByParish(parishId, {
          page: 1,
          limit: 10,
          sortBy: 'code',
          sort: 'ASC',
          search: tagDefinition.code,
        });
        const tag = refreshedTags.items.find((item) => item.code === tagDefinition.code);

        if (tag === undefined) {
          throw error;
        }

        tagIdsByCode.set(tagDefinition.code, tag.id);
        summary.tagsExisting += 1;
        this.logger.log(`Demo question tag ${tagDefinition.code} already exists.`);
      }
    }

    return tagIdsByCode;
  }

  private async ensureQuestion(
    parishId: string,
    adminUserId: string,
    definition: QuestionBankDemoSeedQuestionDefinition,
    tagIdsByCode: ReadonlyMap<string, string>,
    curriculumContext: DemoCurriculumContext,
    summary: QuestionBankDemoSeedSummary,
  ): Promise<void> {
    const existingQuestion = await this.findQuestionByCode(parishId, definition.code);

    if (existingQuestion !== null) {
      summary.questionsExisting += 1;

      if (existingQuestion.currentPublishedVersionId !== null) {
        summary.questionsAlreadyPublished += 1;
      }

      this.logger.log(`Demo question ${definition.code} already exists.`);

      return;
    }

    const created = await this.questionBankService.createQuestion(parishId, {
      code: definition.code,
      sourceLocale: QUESTION_BANK_DEMO_SOURCE_LOCALE,
      createdByUserId: adminUserId,
      draft: {
        questionType: definition.questionType,
        prompt: definition.prompt,
        instruction: definition.instruction,
        explanation: definition.explanation,
        difficulty: definition.difficulty,
      },
    });
    summary.questionsCreated += 1;
    this.logger.log(`Created demo question ${definition.code}.`);

    let versionId = created.initialVersion.id;

    await this.questionBankService.updateDraftVersion(versionId, {
      questionType: definition.questionType,
      prompt: definition.prompt,
      instruction: definition.instruction,
      explanation: definition.explanation,
      difficulty: definition.difficulty,
    });

    if (definition.questionType !== QuestionType.TrueFalse) {
      const options = await this.questionOptionService.replaceDraftOptions(
        versionId,
        definition.options.map((option) => ({
          code: option.code ?? null,
          text: option.text,
          mediaAssetId: null,
          sortOrder: option.sortOrder,
        })),
      );
      const correctOptionIds = this.resolveCorrectOptionIds(
        definition,
        options.map((option) => ({ id: option.id, sortOrder: option.sortOrder })),
      );
      await this.questionOptionService.setCorrectOptions(versionId, correctOptionIds);
    } else {
      const options = await this.questionOptionService.listOptionsByVersion(versionId);
      const trueOption = options.find((option) => option.code === TRUE_FALSE_OPTION_CODE_TRUE);

      if (trueOption === undefined) {
        throw new Error(`Expected true/false options for demo question ${definition.code}.`);
      }

      await this.questionOptionService.setCorrectOptions(versionId, [trueOption.id]);
    }

    for (const tagCode of definition.tagCodes) {
      const tagId = tagIdsByCode.get(tagCode);

      if (tagId === undefined) {
        continue;
      }

      const existingLinks = await this.questionTagService.listTagsByQuestion(created.question.id);
      const alreadyLinked = existingLinks.some((tag) => tag.code === tagCode);

      if (!alreadyLinked) {
        await this.questionTagService.linkTag(created.question.id, tagId);
        summary.tagLinksCreated += 1;
      }
    }

    if (definition.linkCurriculum && curriculumContext.canonicalLessonKey !== null) {
      const existingLinks = await this.questionCurriculumLinkService.listLinksByQuestion(
        created.question.id,
      );
      const alreadyLinked = existingLinks.some(
        (link) =>
          link.curriculumId === curriculumContext.curriculumId &&
          link.canonicalLessonKey === curriculumContext.canonicalLessonKey,
      );

      if (!alreadyLinked) {
        await this.questionCurriculumLinkService.createLink(created.question.id, {
          curriculumId: curriculumContext.curriculumId,
          canonicalLessonKey: curriculumContext.canonicalLessonKey,
          authoringCurriculumVersionId: curriculumContext.publishedVersionId,
        });
        summary.curriculumLinksCreated += 1;
      }
    }

    if (definition.publish) {
      const publishedVersion = await this.questionBankService.publishDraftVersion(
        versionId,
        adminUserId,
      );
      versionId = publishedVersion.id;
      summary.questionsPublished += 1;
      this.logger.log(`Published demo question ${definition.code}.`);
    }
  }

  private async findQuestionByCode(
    parishId: string,
    code: string,
  ): Promise<QuestionSnapshot | null> {
    const listResult = await this.questionBankService.listQuestionsByParish(parishId, {
      page: 1,
      limit: 5,
      sortBy: 'updatedAt',
      sort: 'DESC',
      code,
    });

    return listResult.items.find((item) => item.code === code) ?? null;
  }

  private resolveCorrectOptionIds(
    definition: QuestionBankDemoSeedQuestionDefinition,
    options: readonly { id: string; sortOrder: number }[],
  ): string[] {
    const sortOrderSet = new Set(definition.correctOptionSortOrders);
    const correctOptionIds = options
      .filter((option) => sortOrderSet.has(option.sortOrder))
      .map((option) => option.id);

    if (correctOptionIds.length !== definition.correctOptionSortOrders.length) {
      throw new Error(`Could not resolve correct options for demo question ${definition.code}.`);
    }

    return correctOptionIds;
  }
}
