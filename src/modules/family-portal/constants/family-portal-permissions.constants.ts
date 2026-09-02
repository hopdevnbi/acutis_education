import { CLASS_READ_PERMISSION } from '../../class/constants/class-permissions.constants';
import { ENROLLMENT_READ_PERMISSION } from '../../enrollment/constants/enrollment.constants';
import { EXAM_RESULT_READ_PERMISSION } from '../../exam/constants/exam-permissions.constants';
import { LEARNING_PROGRESS_READ_PERMISSION } from '../../learning-progress/constants/learning-progress-permissions.constants';
import { PRACTICE_READ_PERMISSION } from '../../practice/constants/practice-permissions.constants';

export const FAMILY_PORTAL_CATECHIST_READ_PERMISSIONS = [
  CLASS_READ_PERMISSION,
  ENROLLMENT_READ_PERMISSION,
  LEARNING_PROGRESS_READ_PERMISSION,
] as const;

export const FAMILY_PORTAL_PARENT_READ_PERMISSIONS = [
  ENROLLMENT_READ_PERMISSION,
  LEARNING_PROGRESS_READ_PERMISSION,
  PRACTICE_READ_PERMISSION,
  EXAM_RESULT_READ_PERMISSION,
] as const;
