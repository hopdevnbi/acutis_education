import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON2ID_OPTIONS = {
  type: argon2.argon2id,
} as const;

@Injectable()
export class PasswordHashService {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, ARGON2ID_OPTIONS);
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return argon2.verify(passwordHash, plainPassword);
  }

  needsRehash(passwordHash: string): boolean {
    return argon2.needsRehash(passwordHash);
  }
}
