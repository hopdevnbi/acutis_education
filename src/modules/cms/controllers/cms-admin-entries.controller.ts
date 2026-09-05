import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CmsAccessService } from '../access/cms-access.service';
import { CmsService } from '../cms.service';
import { CMS_MANAGE_PERMISSION } from '../constants/cms-permissions.constants';
import {
  CmsEntryAdminListQueryDto,
  CmsEntryAdminListResponseDto,
  CmsEntryAdminResponseDto,
} from '../dto/cms-entry.dto';
import { toCmsEntryAdminResponseDto } from '../mappers/cms-http.mapper';
import { rethrowCmsServiceError } from '../utils/cms-http.util';

@ApiTags('admin-cms')
@Controller('admin/cms/entries')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class CmsAdminEntriesController {
  constructor(
    private readonly cmsService: CmsService,
    private readonly cmsAccessService: CmsAccessService,
  ) {}

  @Get()
  @RequirePermissions(CMS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Admin list CMS entries across lifecycle states',
    description:
      'List entries including DRAFT, SCHEDULED, PUBLISHED, and ARCHIVED. SuperAdmin can list all; ParishAdmin is restricted to their parish.',
  })
  @ApiOkResponse({ type: CmsEntryAdminListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filter parameters' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  async listAdmin(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: CmsEntryAdminListQueryDto,
  ): Promise<CmsEntryAdminListResponseDto> {
    try {
      const isSuperAdmin = await this.cmsAccessService.isSuperAdmin(authenticatedUser.userId);
      const adminParishIds = isSuperAdmin
        ? []
        : await this.cmsAccessService.listVisibleParishIds(authenticatedUser.userId);

      const result = await this.cmsService.findAdminList({
        page: query.page,
        limit: query.limit,
        status: query.status,
        type: query.type,
        scopeType: query.scopeType,
        parishId: query.parishId,
        locale: query.locale,
        search: query.search,
        isSuperAdmin,
        adminParishIds,
      });

      return {
        items: result.items.map(toCmsEntryAdminResponseDto),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowCmsServiceError(error);
    }
  }

  @Get(':id')
  @RequirePermissions(CMS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Admin get CMS entry by ID',
    description:
      'Retrieves complete entry details across any status. SuperAdmin can get any entry; ParishAdmin can get only entries belonging to their parish.',
  })
  @ApiParam({ name: 'id', description: 'Entry UUID' })
  @ApiOkResponse({ type: CmsEntryAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Entry not found' })
  async getAdminById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CmsEntryAdminResponseDto> {
    try {
      const isSuperAdmin = await this.cmsAccessService.isSuperAdmin(authenticatedUser.userId);
      const adminParishIds = isSuperAdmin
        ? []
        : await this.cmsAccessService.listVisibleParishIds(authenticatedUser.userId);

      const snapshot = await this.cmsService.getAdminById(id, {
        isSuperAdmin,
        adminParishIds,
      });

      return toCmsEntryAdminResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCmsServiceError(error);
    }
  }
}
