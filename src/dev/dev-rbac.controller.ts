import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../modules/access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../modules/access-control/guards/permission.guard';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@ApiTags('dev-rbac')
@Controller('dev/rbac')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DevRbacController {
  @Get('read')
  @RequirePermissions('auth.test.read')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Dev-only RBAC read verification endpoint',
    description: 'Available only outside production. Requires auth.test.read.',
  })
  @ApiOkResponse({ description: 'Authenticated caller has auth.test.read.' })
  verifyReadPermission(): { status: string } {
    return { status: 'ok' };
  }

  @Get('manage')
  @RequirePermissions('auth.test.manage')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Dev-only RBAC manage verification endpoint',
    description: 'Available only outside production. Requires auth.test.manage.',
  })
  @ApiOkResponse({ description: 'Authenticated caller has auth.test.manage.' })
  verifyManagePermission(): { status: string } {
    return { status: 'ok' };
  }
}
