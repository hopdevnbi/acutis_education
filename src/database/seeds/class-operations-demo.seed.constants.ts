import {
  AUTH_RBAC_SAMPLE_PASSWORD,
} from './auth-rbac.seed.constants';
import {
  CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_EMAIL,
  CLASS_ENROLLMENT_SEED_ADMIN_EMAIL,
  CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL,
  CLASS_ENROLLMENT_SEED_PARENT_EMAIL,
} from './class-enrollment.seed.constants';

/** Stable local demo password shared by Auth/RBAC sample users (dev/test only). */
export const CLASS_OPERATIONS_DEMO_SAMPLE_PASSWORD = AUTH_RBAC_SAMPLE_PASSWORD;

export const CLASS_OPERATIONS_DEMO_CATECHIST_EMAIL = CLASS_ENROLLMENT_SEED_CATECHIST_EMAIL;

export const CLASS_OPERATIONS_DEMO_PARENT_EMAIL = CLASS_ENROLLMENT_SEED_PARENT_EMAIL;

export const CLASS_OPERATIONS_DEMO_STUDENT_EMAIL = CLASS_ENROLLMENT_DEMO_STUDENT_ALPHA_EMAIL;

export const CLASS_OPERATIONS_DEMO_ADMIN_EMAIL = CLASS_ENROLLMENT_SEED_ADMIN_EMAIL;

/** Extra roster learner for Class A (created by Class Operations demo seed if missing). */
export const CLASS_OPERATIONS_DEMO_STUDENT_GAMMA_NAME = 'Class Ops Demo Student Gamma' as const;

/** Stable session titles for idempotent demo fixture matching. */
export const CLASS_OPERATIONS_DEMO_SESSION_TITLES = {
  completedPresentLate: 'co-demo-completed-present-late',
  completedAbsentExcused: 'co-demo-completed-absent-excused',
  completedUnmarked: 'co-demo-completed-unmarked',
  scheduledUpcoming: 'co-demo-scheduled-upcoming',
  cancelled: 'co-demo-cancelled',
} as const;
