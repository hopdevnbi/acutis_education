import { MODULE_METADATA } from '@nestjs/common/constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from './access-control/access-control.module';
import { AuthModule } from './auth/auth.module';
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
  it.each([
    ['UsersModule', UsersModule],
    ['AuthModule', AuthModule],
    ['AccessControlModule', AccessControlModule],
  ])('does not export TypeOrmModule from %s', (_label, moduleType) => {
    const exports = resolveModuleExports(moduleType);

    expect(exports).not.toContain(TypeOrmModule);
    expect(exports).toHaveLength(0);
  });
});
