import { isEmail } from 'class-validator';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return isEmail(normalizeEmail(email));
}
