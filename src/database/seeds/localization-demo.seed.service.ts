import { Injectable, Logger } from '@nestjs/common';
import { normalizeUuid } from '../../database/uuid-v4.util';
import { CurriculumService } from '../../modules/curriculum/services/curriculum.service';
import { LessonService } from '../../modules/curriculum/services/lesson.service';
import { TopicService } from '../../modules/curriculum/services/topic.service';
import { TranslationResourceType } from '../../modules/localization/enums/translation-resource-type.enum';
import type { TranslationResourceSnapshot } from '../../modules/localization/interfaces/localization.interface';
import { TranslationRevisionStatus } from '../../modules/localization/enums/translation-revision-status.enum';
import { LocalizationService } from '../../modules/localization/services/localization.service';
import {
  computeCurriculumLessonContentHash,
  computeCurriculumMetadataContentHash,
  computeCurriculumTopicContentHash,
  computeCurriculumVersionContentHash,
} from '../../modules/localization/utils/curriculum-translation-hash.util';
import {
  applyQuestionBankTranslation,
  buildQuestionBankTranslationPayload,
} from '../../modules/localization/utils/question-bank-translation.util';
import { QuestionBankService } from '../../modules/question-bank/services/question-bank.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import {
  LOCALIZATION_DEMO_APPROVED_QUESTION_CODE,
  LOCALIZATION_DEMO_CURRICULUM_TRANSLATIONS,
  LOCALIZATION_DEMO_LESSON_TRANSLATIONS,
  LOCALIZATION_DEMO_MACHINE_TRANSLATED_QUESTION_CODE,
  LOCALIZATION_DEMO_SEED_ADMIN_EMAIL,
  LOCALIZATION_DEMO_TARGET_LOCALE,
  LOCALIZATION_DEMO_TOPIC_TRANSLATIONS,
} from './localization-demo.seed.constants';
import { PARISH_ACADEMIC_SAMPLE_PARISH_CODE } from './parish-academic.seed.constants';
import { CURRICULUM_DEMO_CURRICULUM_CODE } from './curriculum-demo.seed.constants';

export class LocalizationDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalizationDemoSeedPrerequisiteError';
  }
}

export interface LocalizationDemoSeedSummary {
  resourcesCreated: number;
  resourcesExisting: number;
  revisionsCreated: number;
  revisionsExisting: number;
  approvedQuestionCode: string;
  machineTranslatedQuestionCode: string;
}

@Injectable()
export class LocalizationDemoSeedService {
  private readonly logger = new Logger(LocalizationDemoSeedService.name);

  constructor(
    private readonly parishService: ParishService,
    private readonly userAccountService: UserAccountService,
    private readonly curriculumService: CurriculumService,
    private readonly topicService: TopicService,
    private readonly lessonService: LessonService,
    private readonly questionBankService: QuestionBankService,
    private readonly localizationService: LocalizationService,
  ) {}

  async run(): Promise<LocalizationDemoSeedSummary> {
    const summary: LocalizationDemoSeedSummary = {
      resourcesCreated: 0,
      resourcesExisting: 0,
      revisionsCreated: 0,
      revisionsExisting: 0,
      approvedQuestionCode: LOCALIZATION_DEMO_APPROVED_QUESTION_CODE,
      machineTranslatedQuestionCode: LOCALIZATION_DEMO_MACHINE_TRANSLATED_QUESTION_CODE,
    };

    const parish = await this.findDemoParish();
    const adminUser = await this.requireSeedUser(
      LOCALIZATION_DEMO_SEED_ADMIN_EMAIL,
      'npm run seed:auth-rbac',
    );
    const curriculum = await this.findDemoCurriculum(parish.id);

    if (curriculum.currentPublishedVersionId === null) {
      throw new LocalizationDemoSeedPrerequisiteError(
        `Published demo curriculum "${CURRICULUM_DEMO_CURRICULUM_CODE}" not found. Run npm run seed:curriculum-demo first.`,
      );
    }

    const publishedVersion = await this.curriculumService.getVersionById(
      curriculum.currentPublishedVersionId,
    );
    const tree = await this.curriculumService.getVersionTree(publishedVersion.id);

    await this.seedCurriculumMetadataTranslation({
      parishId: parish.id,
      adminUserId: adminUser.id,
      curriculum,
      summary,
    });
    await this.seedCurriculumVersionTranslation({
      parishId: parish.id,
      adminUserId: adminUser.id,
      curriculum,
      versionLabel: publishedVersion.label ?? '',
      versionId: publishedVersion.id,
      summary,
    });

    for (const topicNode of tree.topics) {
      const topic = await this.topicService.getTopicById(topicNode.id);
      const topicTranslation = this.resolveTopicTranslation(
        topic.code ?? topicNode.code ?? '',
        topic.title,
        topic.description,
      );

      await this.seedApprovedRevision({
        parishId: parish.id,
        adminUserId: adminUser.id,
        resourceType: TranslationResourceType.CurriculumTopic,
        resourceId: topic.id,
        sourceLocale: curriculum.sourceLocale,
        sourceContentHash: computeCurriculumTopicContentHash({
          title: topic.title,
          description: topic.description,
        }),
        payload: {
          title: topicTranslation.title,
          description: topicTranslation.description,
        },
        summary,
      });

      for (const lessonNode of topicNode.lessons) {
        const lesson = await this.lessonService.getLessonById(lessonNode.id);
        const lessonTranslation = this.resolveLessonTranslation(
          lesson.code ?? lessonNode.code ?? '',
          lesson.title,
          lesson.summary,
        );

        await this.seedApprovedRevision({
          parishId: parish.id,
          adminUserId: adminUser.id,
          resourceType: TranslationResourceType.CurriculumLesson,
          resourceId: lesson.id,
          sourceLocale: curriculum.sourceLocale,
          sourceContentHash: computeCurriculumLessonContentHash({
            title: lesson.title,
            summary: lesson.summary,
          }),
          payload: {
            title: lessonTranslation.title,
            summary: lessonTranslation.summary,
          },
          summary,
        });
      }
    }

    await this.seedQuestionTranslation({
      parishId: parish.id,
      adminUserId: adminUser.id,
      questionCode: LOCALIZATION_DEMO_APPROVED_QUESTION_CODE,
      status: TranslationRevisionStatus.Approved,
      summary,
    });
    await this.seedQuestionTranslation({
      parishId: parish.id,
      adminUserId: adminUser.id,
      questionCode: LOCALIZATION_DEMO_MACHINE_TRANSLATED_QUESTION_CODE,
      status: TranslationRevisionStatus.MachineTranslated,
      summary,
    });

    return summary;
  }

  private async findDemoParish(): Promise<Awaited<ReturnType<ParishService['getParishById']>>> {
    const parishes = await this.parishService.listParishes({
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      search: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
    });
    const parish = parishes.items.find((item) => item.code === PARISH_ACADEMIC_SAMPLE_PARISH_CODE);

    if (parish === undefined) {
      throw new LocalizationDemoSeedPrerequisiteError(
        `Demo parish "${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}" not found. Run npm run seed:parish-academic first.`,
      );
    }

    return this.parishService.getParishById(parish.id);
  }

  private async requireSeedUser(
    email: string,
    prerequisiteCommand: string,
  ): Promise<
    Awaited<ReturnType<UserAccountService['findAccountSnapshotByEmail']>> & { id: string }
  > {
    const user = await this.userAccountService.findAccountSnapshotByEmail(email);

    if (user === null) {
      throw new LocalizationDemoSeedPrerequisiteError(
        `Seed user "${email}" not found. Run ${prerequisiteCommand} first.`,
      );
    }

    return user;
  }

  private async findDemoCurriculum(
    parishId: string,
  ): Promise<Awaited<ReturnType<CurriculumService['getCurriculumById']>>> {
    const curricula = await this.curriculumService.listCurriculaByParish(parishId, {
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'ASC',
      search: CURRICULUM_DEMO_CURRICULUM_CODE,
    });
    const curriculum = curricula.items.find(
      (item) => item.code === CURRICULUM_DEMO_CURRICULUM_CODE,
    );

    if (curriculum === undefined || curriculum.currentPublishedVersionId === null) {
      throw new LocalizationDemoSeedPrerequisiteError(
        `Published demo curriculum "${CURRICULUM_DEMO_CURRICULUM_CODE}" not found. Run npm run seed:curriculum-demo first.`,
      );
    }

    return this.curriculumService.getCurriculumById(curriculum.id);
  }

  private resolveTopicTranslation(
    code: string,
    fallbackTitle: string,
    fallbackDescription: string | null,
  ): { readonly title: string; readonly description: string | null } {
    const mapped = LOCALIZATION_DEMO_TOPIC_TRANSLATIONS[code];

    return {
      title: mapped?.title ?? `${fallbackTitle} (English)`,
      description: mapped?.description ?? fallbackDescription,
    };
  }

  private resolveLessonTranslation(
    code: string,
    fallbackTitle: string,
    fallbackSummary: string | null,
  ): { readonly title: string; readonly summary: string | null } {
    const mapped = LOCALIZATION_DEMO_LESSON_TRANSLATIONS[code];

    return {
      title: mapped?.title ?? `${fallbackTitle} (English)`,
      summary: mapped?.summary ?? fallbackSummary,
    };
  }

  private async seedCurriculumMetadataTranslation(input: {
    readonly parishId: string;
    readonly adminUserId: string;
    readonly curriculum: Awaited<ReturnType<CurriculumService['getCurriculumById']>>;
    readonly summary: LocalizationDemoSeedSummary;
  }): Promise<void> {
    await this.seedApprovedRevision({
      parishId: input.parishId,
      adminUserId: input.adminUserId,
      resourceType: TranslationResourceType.CurriculumMetadata,
      resourceId: input.curriculum.id,
      sourceLocale: input.curriculum.sourceLocale,
      sourceContentHash: computeCurriculumMetadataContentHash({
        name: input.curriculum.name,
        description: input.curriculum.description,
      }),
      payload: {
        name: LOCALIZATION_DEMO_CURRICULUM_TRANSLATIONS.name,
        description: LOCALIZATION_DEMO_CURRICULUM_TRANSLATIONS.description,
      },
      summary: input.summary,
    });
  }

  private async seedCurriculumVersionTranslation(input: {
    readonly parishId: string;
    readonly adminUserId: string;
    readonly curriculum: Awaited<ReturnType<CurriculumService['getCurriculumById']>>;
    readonly versionLabel: string;
    readonly versionId: string;
    readonly summary: LocalizationDemoSeedSummary;
  }): Promise<void> {
    await this.seedApprovedRevision({
      parishId: input.parishId,
      adminUserId: input.adminUserId,
      resourceType: TranslationResourceType.CurriculumVersion,
      resourceId: input.versionId,
      sourceLocale: input.curriculum.sourceLocale,
      sourceContentHash: computeCurriculumVersionContentHash({ label: input.versionLabel }),
      payload: {
        label: LOCALIZATION_DEMO_CURRICULUM_TRANSLATIONS.versionLabel,
      },
      summary: input.summary,
    });
  }

  private async seedApprovedRevision(input: {
    readonly parishId: string;
    readonly adminUserId: string;
    readonly resourceType: TranslationResourceType;
    readonly resourceId: string;
    readonly sourceLocale: string;
    readonly sourceContentHash: string;
    readonly payload: Record<string, unknown>;
    readonly summary: LocalizationDemoSeedSummary;
  }): Promise<void> {
    await this.seedRevision({
      ...input,
      status: TranslationRevisionStatus.Approved,
    });
  }

  private async seedRevision(input: {
    readonly parishId: string;
    readonly adminUserId: string;
    readonly resourceType: TranslationResourceType;
    readonly resourceId: string;
    readonly sourceLocale: string;
    readonly sourceContentHash: string;
    readonly payload: Record<string, unknown>;
    readonly status: TranslationRevisionStatus;
    readonly summary: LocalizationDemoSeedSummary;
  }): Promise<void> {
    let resourceExisting = true;
    let resource: TranslationResourceSnapshot;

    try {
      resource = await this.localizationService.getTranslationResourceByRef({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      });
    } catch {
      resourceExisting = false;
      resource = await this.localizationService.getOrCreateTranslationResource({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        parishId: input.parishId,
        sourceLocale: input.sourceLocale,
      });
    }

    if (resourceExisting) {
      input.summary.resourcesExisting += 1;
    } else {
      input.summary.resourcesCreated += 1;
    }

    const latestRevision = await this.localizationService.getLatestTranslationRevision(
      resource.id,
      LOCALIZATION_DEMO_TARGET_LOCALE,
    );

    if (
      latestRevision !== null &&
      latestRevision.status === input.status &&
      latestRevision.sourceContentHash === input.sourceContentHash
    ) {
      input.summary.revisionsExisting += 1;
      return;
    }

    await this.localizationService.createTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: LOCALIZATION_DEMO_TARGET_LOCALE,
      sourceContentHash: input.sourceContentHash,
      status: input.status,
      payload: input.payload,
      approvedByUserId:
        input.status === TranslationRevisionStatus.Approved ? input.adminUserId : null,
      approvedAt: input.status === TranslationRevisionStatus.Approved ? new Date() : null,
    });
    input.summary.revisionsCreated += 1;
    this.logger.log(
      `Seeded ${input.status} ${input.resourceType} revision for resource ${normalizeUuid(input.resourceId)}.`,
    );
  }

  private async seedQuestionTranslation(input: {
    readonly parishId: string;
    readonly adminUserId: string;
    readonly questionCode: string;
    readonly status: TranslationRevisionStatus;
    readonly summary: LocalizationDemoSeedSummary;
  }): Promise<void> {
    const questions = await this.questionBankService.listQuestionsByParish(input.parishId, {
      page: 1,
      limit: 5,
      sortBy: 'code',
      sort: 'ASC',
      code: input.questionCode,
    });
    const question = questions.items[0];

    if (question === undefined || question.currentPublishedVersionId === null) {
      throw new LocalizationDemoSeedPrerequisiteError(
        `Published demo question "${input.questionCode}" not found. Run npm run seed:question-bank-demo first.`,
      );
    }

    const assessment = await this.questionBankService.getImmutableAssessmentSnapshot(
      question.currentPublishedVersionId,
    );

    if (assessment.sourceContentHash === null) {
      throw new Error(`Expected source content hash for question ${input.questionCode}.`);
    }

    const translatedUnits = assessment.options.map((option, index) => ({
      id: `option:${normalizeUuid(option.id)}:text`,
      text: `English option ${String(index + 1)}`,
    }));

    const translatedPayload = buildQuestionBankTranslationPayload(assessment, [
      { id: 'question.prompt', text: `${assessment.prompt} (English demo)` },
      {
        id: 'question.instruction',
        text: assessment.instruction === null ? '' : `${assessment.instruction} (English demo)`,
      },
      ...translatedUnits,
    ]);
    const display = applyQuestionBankTranslation(assessment, translatedPayload, null);

    await this.seedRevision({
      parishId: input.parishId,
      adminUserId: input.adminUserId,
      resourceType: TranslationResourceType.QuestionBankVersion,
      resourceId: question.currentPublishedVersionId,
      sourceLocale: assessment.sourceLocale,
      sourceContentHash: assessment.sourceContentHash,
      payload: { ...translatedPayload, display },
      status: input.status,
      summary: input.summary,
    });
  }
}
