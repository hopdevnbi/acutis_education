import { AUTH_RBAC_SAMPLE_DOMAIN, AUTH_RBAC_SEED_USERS } from './auth-rbac.seed.constants';
import {
  CURRICULUM_DEMO_CURRICULUM_CODE,
  CURRICULUM_DEMO_SOURCE_LOCALE,
} from './curriculum-demo.seed.constants';
import { QuestionDifficulty } from '../../modules/question-bank/enums/question-difficulty.enum';
import { QuestionType } from '../../modules/question-bank/enums/question-type.enum';

export const QUESTION_BANK_DEMO_SOURCE_LOCALE = CURRICULUM_DEMO_SOURCE_LOCALE;

export const QUESTION_BANK_DEMO_CURRICULUM_CODE = CURRICULUM_DEMO_CURRICULUM_CODE;

export const QUESTION_BANK_DEMO_SEED_ADMIN_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARISH_ADMIN')?.email ??
  `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`;

export interface QuestionBankDemoSeedTagDefinition {
  readonly code: string;
  readonly name: string;
}

export interface QuestionBankDemoSeedOptionDefinition {
  readonly code?: string | null;
  readonly text: string;
  readonly sortOrder: number;
}

export interface QuestionBankDemoSeedQuestionDefinition {
  readonly code: string;
  readonly questionType: QuestionType;
  readonly prompt: string;
  readonly instruction: string | null;
  readonly explanation: string | null;
  readonly difficulty: QuestionDifficulty;
  readonly options: readonly QuestionBankDemoSeedOptionDefinition[];
  readonly correctOptionSortOrders: readonly number[];
  readonly publish: boolean;
  readonly tagCodes: readonly string[];
  readonly linkCurriculum: boolean;
}

export const QUESTION_BANK_DEMO_TAGS: readonly QuestionBankDemoSeedTagDefinition[] = [
  {
    code: 'demo-creation',
    name: 'Sáng Tạo (Demo)',
  },
  {
    code: 'demo-faith',
    name: 'Đức Tin (Demo)',
  },
] as const;

export const QUESTION_BANK_DEMO_QUESTIONS: readonly QuestionBankDemoSeedQuestionDefinition[] = [
  {
    code: 'qb-demo-single-001',
    questionType: QuestionType.SingleChoice,
    prompt: 'Theo đức tin Công giáo, ai là Đấng Sáng Tạo vũ trụ?',
    instruction: 'Chọn một đáp án đúng nhất.',
    explanation: 'Thiên Chúa là Đấng Sáng Tạo mọi vật (synthetic demo content).',
    difficulty: QuestionDifficulty.Easy,
    options: [
      { text: 'Thiên Chúa', sortOrder: 1 },
      { text: 'Con người', sortOrder: 2 },
      { text: 'Thiên nhiên tự phát sinh', sortOrder: 3 },
    ],
    correctOptionSortOrders: [1],
    publish: true,
    tagCodes: ['demo-creation', 'demo-faith'],
    linkCurriculum: true,
  },
  {
    code: 'qb-demo-multi-001',
    questionType: QuestionType.MultipleChoice,
    prompt: 'Những điều nào sau đây là quà tặng của Thiên Chúa? (chọn tất cả đúng)',
    instruction: 'Chọn tất cả đáp án đúng.',
    explanation: 'Mọi sự tốt đẹp đều xuất phát từ Thiên Chúa (synthetic demo content).',
    difficulty: QuestionDifficulty.Medium,
    options: [
      { text: 'Sự sống', sortOrder: 1 },
      { text: 'Thiên nhiên', sortOrder: 2 },
      { text: 'Lòng biết ơn', sortOrder: 3 },
      { text: 'Thói ích kỷ', sortOrder: 4 },
    ],
    correctOptionSortOrders: [1, 2, 3],
    publish: true,
    tagCodes: ['demo-creation'],
    linkCurriculum: true,
  },
  {
    code: 'qb-demo-tf-001',
    questionType: QuestionType.TrueFalse,
    prompt: 'Chúa Giêsu Kitô là Con Thiên Chúa.',
    instruction: 'Chọn Đúng hoặc Sai.',
    explanation: 'Đây là nội dung mẫu cho môi trường phát triển.',
    difficulty: QuestionDifficulty.Easy,
    options: [],
    correctOptionSortOrders: [1],
    publish: true,
    tagCodes: ['demo-faith'],
    linkCurriculum: true,
  },
  {
    code: 'qb-demo-draft-001',
    questionType: QuestionType.SingleChoice,
    prompt: 'Bài tập nháp: Ai dẫn dắt Giáo hội trên thế giới?',
    instruction: null,
    explanation: null,
    difficulty: QuestionDifficulty.Easy,
    options: [
      { text: 'Đức Giáo hoàng', sortOrder: 1 },
      { text: 'Một chính trị gia', sortOrder: 2 },
    ],
    correctOptionSortOrders: [1],
    publish: false,
    tagCodes: ['demo-faith'],
    linkCurriculum: false,
  },
] as const;
