import { MODULE_METADATA } from '@nestjs/common/constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from './access-control/access-control.module';
import { AuthModule } from './auth/auth.module';
import { UserAccountService } from './users/services/user-account.service';
import { UsersModule } from './users/users.module';

type NestModuleConstructor = abstract new (...args: never[]) => unknown;

function resolveModuleExports(moduleType: NestModuleConstructor): unknown[] {
  const exports: unknown = Reflect.getMetadata(MODULE_METADATA.EXPORTS, moduleType);

  if (!Array.isArray(exports)) {
    return [];
  }

  return exports;
}

describe('Auth module persistence boundaries', () => {
  it('exports only UserAccountService from UsersModule', () => {
    const exports = resolveModuleExports(UsersModule);

    expect(exports).toHaveLength(1);
    expect(exports[0]).toBe(UserAccountService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it.each([
    ['AuthModule', AuthModule],
    ['AccessControlModule', AccessControlModule],
  ])('does not export persistence infrastructure from %s', (_label, moduleType) => {
    const exports = resolveModuleExports(moduleType);

    expect(exports).not.toContain(TypeOrmModule);
    expect(exports).toHaveLength(0);
  });
});
