import { InvalidStudentFullNameError } from '../errors/student.errors';
import { STUDENT_FULL_NAME_MAX_LENGTH } from '../constants/student.constants';

export function normalizeStudentFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, ' ');
}

export function isValidStudentFullName(fullName: string): boolean {
  return fullName.length > 0 && fullName.length <= STUDENT_FULL_NAME_MAX_LENGTH;
}

export function parseStudentFullName(rawFullName: string): string {
  const normalizedFullName = normalizeStudentFullName(rawFullName);

  if (!isValidStudentFullName(normalizedFullName)) {
    throw new InvalidStudentFullNameError();
  }

  return normalizedFullName;
}
