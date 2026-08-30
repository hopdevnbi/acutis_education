import { SetMetadata } from '@nestjs/common';
import { REQUIRE_PERMISSIONS_METADATA_KEY } from '../constants/require-permissions-metadata.constants';
import { InvalidPermissionCodeError } from '../errors/access-control.errors';
import { parsePermissionCode } from '../utils/permission-code.util';

export function RequirePermissions(...permissionCodes: string[]): MethodDecorator & ClassDecorator {
  if (permissionCodes.length === 0) {
    throw new Error('RequirePermissions must declare at least one permission code.');
  }

  const normalizedPermissionCodes = permissionCodes.map((permissionCode) => {
    try {
      return parsePermissionCode(permissionCode);
    } catch (error: unknown) {
      if (error instanceof InvalidPermissionCodeError) {
        throw new Error(`RequirePermissions contains invalid permission code: ${permissionCode}`);
      }

      throw error;
    }
  });

  return SetMetadata(REQUIRE_PERMISSIONS_METADATA_KEY, normalizedPermissionCodes);
}
