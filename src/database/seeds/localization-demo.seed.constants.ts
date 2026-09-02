import { AUTH_RBAC_SAMPLE_DOMAIN, AUTH_RBAC_SEED_USERS } from './auth-rbac.seed.constants';
import {
  CURRICULUM_DEMO_CURRICULUM_CODE,
  CURRICULUM_DEMO_CURRICULUM_DESCRIPTION,
  CURRICULUM_DEMO_SOURCE_LOCALE,
  CURRICULUM_DEMO_TOPICS,
} from './curriculum-demo.seed.constants';
import { QUESTION_BANK_DEMO_QUESTIONS } from './question-bank-demo.seed.constants';

export const LOCALIZATION_DEMO_TARGET_LOCALE = 'en-US' as const;

export const LOCALIZATION_DEMO_SEED_ADMIN_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARISH_ADMIN')?.email ??
  `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`;

export const LOCALIZATION_DEMO_CURRICULUM_CODE = CURRICULUM_DEMO_CURRICULUM_CODE;

export const LOCALIZATION_DEMO_SOURCE_LOCALE = CURRICULUM_DEMO_SOURCE_LOCALE;

export const LOCALIZATION_DEMO_CURRICULUM_TRANSLATIONS = {
  name: 'Demo Level 1 Curriculum (English)',
  description: CURRICULUM_DEMO_CURRICULUM_DESCRIPTION,
  versionLabel: '2026-2027 v1 (Demo, English)',
} as const;

export const LOCALIZATION_DEMO_TOPIC_TRANSLATIONS: Readonly<
  Record<string, { readonly title: string; readonly description: string }>
> = Object.fromEntries(
  CURRICULUM_DEMO_TOPICS.map((topic) => [
    topic.code,
    {
      title:
        topic.code === 'demo-topic-creation'
          ? 'God the Creator'
          : topic.code === 'demo-topic-jesus'
            ? 'Jesus Christ'
            : `${topic.title} (English)`,
      description: `${topic.description} (English demo translation)`,
    },
  ]),
);

export const LOCALIZATION_DEMO_LESSON_TRANSLATIONS: Readonly<
  Record<string, { readonly title: string; readonly summary: string }>
> = Object.fromEntries(
  CURRICULUM_DEMO_TOPICS.flatMap((topic) =>
    topic.lessons.map((lesson) => [
      lesson.code,
      {
        title: `${lesson.title} (English)`,
        summary: `${lesson.summary} (English demo translation)`,
      },
    ]),
  ),
);

export const LOCALIZATION_DEMO_APPROVED_QUESTION_CODE =
  QUESTION_BANK_DEMO_QUESTIONS.find((question) => question.code === 'qb-demo-single-001')?.code ??
  'qb-demo-single-001';

export const LOCALIZATION_DEMO_MACHINE_TRANSLATED_QUESTION_CODE =
  QUESTION_BANK_DEMO_QUESTIONS.find((question) => question.code === 'qb-demo-multi-001')?.code ??
  'qb-demo-multi-001';
