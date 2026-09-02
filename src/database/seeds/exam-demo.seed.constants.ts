import { AUTH_RBAC_SAMPLE_DOMAIN, AUTH_RBAC_SEED_USERS } from './auth-rbac.seed.constants';
import { CLASS_ENROLLMENT_DEMO_CLASS_A_CODE } from './class-enrollment.seed.constants';
import { CURRICULUM_DEMO_SOURCE_LOCALE } from './curriculum-demo.seed.constants';

export const EXAM_DEMO_CODE = 'exam-demo-formal-001' as const;
export const EXAM_DEMO_CLASS_CODE = CLASS_ENROLLMENT_DEMO_CLASS_A_CODE;
export const EXAM_DEMO_SOURCE_LOCALE = CURRICULUM_DEMO_SOURCE_LOCALE;

export const EXAM_DEMO_QUESTION_CODES = ['qb-demo-single-001', 'qb-demo-multi-001'] as const;

export const EXAM_DEMO_SEED_ADMIN_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARISH_ADMIN')?.email ??
  `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`;

export const EXAM_DEMO_STUDENT_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'STUDENT')?.email ??
  `student-alpha@${AUTH_RBAC_SAMPLE_DOMAIN}`;
