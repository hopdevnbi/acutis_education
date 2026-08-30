import { MODULE_METADATA } from '@nestjs/common/constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from './access-control/access-control.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
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

  it('exports only JwtAuthGuard from AuthModule', () => {
    const exports = resolveModuleExports(AuthModule);

    expect(exports).toHaveLength(1);
    expect(exports[0]).toBe(JwtAuthGuard);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('does not export persistence infrastructure from AccessControlModule', () => {
    const exports = resolveModuleExports(AccessControlModule);

    expect(exports).not.toContain(TypeOrmModule);
    expect(exports).toHaveLength(0);
  });
});
