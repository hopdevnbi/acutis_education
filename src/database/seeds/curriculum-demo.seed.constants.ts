import { AUTH_RBAC_SAMPLE_DOMAIN, AUTH_RBAC_SEED_USERS } from './auth-rbac.seed.constants';
import { CLASS_ENROLLMENT_DEMO_LEVEL_CODE } from './class-enrollment.seed.constants';

export const CURRICULUM_DEMO_CURRICULUM_CODE = 'demo-curriculum-level-1' as const;
export const CURRICULUM_DEMO_CURRICULUM_NAME = 'Giáo trình Demo Cấp 1 (Local Sample)' as const;
export const CURRICULUM_DEMO_CURRICULUM_DESCRIPTION =
  'Synthetic demo curriculum for local development and integration tests.' as const;
export const CURRICULUM_DEMO_SOURCE_LOCALE = 'vi-VN' as const;
export const CURRICULUM_DEMO_VERSION_LABEL = '2026-2027 v1 (Demo)' as const;
export const CURRICULUM_DEMO_LEVEL_CODE = CLASS_ENROLLMENT_DEMO_LEVEL_CODE;

export interface CurriculumDemoSeedLessonDefinition {
  readonly code: string;
  readonly title: string;
  readonly summary: string;
}

export interface CurriculumDemoSeedTopicDefinition {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly lessons: readonly CurriculumDemoSeedLessonDefinition[];
}

export const CURRICULUM_DEMO_TOPICS: readonly CurriculumDemoSeedTopicDefinition[] = [
  {
    code: 'demo-topic-creation',
    title: 'Chúa Sáng Tạo',
    description: 'Chủ đề mẫu về Thiên Chúa là Đấng Sáng Tạo.',
    lessons: [
      {
        code: 'demo-lesson-creation-1',
        title: 'Thế Giới Do Chúa Tạo Dựng',
        summary: 'Bài học mẫu: mọi vật đều do Chúa ban tặng.',
      },
      {
        code: 'demo-lesson-creation-2',
        title: 'Con Người — Hình Ảnh Của Chúa',
        summary: 'Bài học mẫu: phẩm giá con người trong mắt Chúa.',
      },
    ],
  },
  {
    code: 'demo-topic-jesus',
    title: 'Chúa Giêsu Kitô',
    description: 'Chủ đề mẫu về Chúa Giêsu.',
    lessons: [
      {
        code: 'demo-lesson-jesus-1',
        title: 'Chúa Giêsu Sinh Ra',
        summary: 'Bài học mẫu: Chúa Giêsu đến với chúng ta.',
      },
      {
        code: 'demo-lesson-jesus-2',
        title: 'Chúa Giêsu Yêu Thương',
        summary: 'Bài học mẫu: Chúa Giêsu mời gọi chúng ta yêu thương.',
      },
    ],
  },
] as const;

export const CURRICULUM_DEMO_SEED_ADMIN_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARISH_ADMIN')?.email ??
  `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`;

export function buildCurriculumDemoContentDocument(lessonTitle: string): {
  schemaVersion: 1;
  blocks: Array<
    | { type: 'heading'; level: 1 | 2 | 3; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'scripture_ref'; reference: string; text?: string }
  >;
} {
  return {
    schemaVersion: 1,
    blocks: [
      { type: 'heading', level: 1, text: lessonTitle },
      {
        type: 'paragraph',
        text: 'Đây là nội dung mẫu tổng hợp cho môi trường phát triển. Không sao chép từ sách giáo khoa có bản quyền.',
      },
      {
        type: 'scripture_ref',
        reference: 'St 1,31',
        text: 'Thiên Chúa thấy mọi sự Người đã tạo ra đều tốt đẹp.',
      },
    ],
  };
}
