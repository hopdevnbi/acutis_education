import { PasswordHashService } from './password-hash.service';

describe('PasswordHashService', () => {
  const passwordHashService = new PasswordHashService();

  it('hashes and verifies passwords with Argon2id PHC strings', async () => {
    const password = 'SecurePassword123!';
    const passwordHash = await passwordHashService.hash(password);

    expect(passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(passwordHash.length).toBeLessThanOrEqual(255);
    expect(await passwordHashService.verify(password, passwordHash)).toBe(true);
    expect(await passwordHashService.verify('wrong-password', passwordHash)).toBe(false);
  });

  it('reports when an existing hash matches current Argon2id options', async () => {
    const passwordHash = await passwordHashService.hash('SecurePassword123!');

    expect(passwordHashService.needsRehash(passwordHash)).toBe(false);
  });
});
