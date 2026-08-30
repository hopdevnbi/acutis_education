import { AUTH_RBAC_SAMPLE_DOMAIN, AUTH_RBAC_SEED_USERS } from './auth-rbac.seed.constants';
import { PARISH_ACADEMIC_SEED_LEVELS } from './parish-academic.seed.constants';

export const CLASS_ENROLLMENT_DEMO_CLASS_A_CODE = 'demo-class-a' as const;
export const CLASS_ENROLLMENT_DEMO_CLASS_B_CODE = 'demo-class-b' as const;
export const CLASS_ENROLLMENT_DEMO_CLASS_A_NAME = 'Lớp Demo A (Local Sample)' as const;
export const CLASS_ENROLLMENT_DEMO_CLASS_B_NAME = 'Lớp Demo B (Local Sample)' as const;

export const CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_NAME = 'Demo Student Alpha' as const;
export const CLASS_ENROLLMENT_DEMO_STUDENT_BETA_NAME = 'Demo Student Beta' as const;

export const CLASS_ENROLLMENT_DEMO_LEVEL_CODE =
  PARISH_ACADEMIC_SEED_LEVELS[0]?.code ?? 'demo-level-1';

export const CLASS_ENROLLMENT_SEED_ADMIN_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARISH_ADMIN')?.email ??
  `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`;

export const CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'CATECHIST')?.email ??
  `catechist@${AUTH_RBAC_SAMPLE_DOMAIN}`;

export const CLASS_ENROLLMENT_SEED_PARENT_EMAIL =
  AUTH_RBAC_SEED_USERS.find((user) => user.roleCode === 'PARENT')?.email ??
  `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`;
