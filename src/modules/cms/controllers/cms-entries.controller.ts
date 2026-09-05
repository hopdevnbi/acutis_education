import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { OptionalCurrentUser } from '../decorators/optional-current-user.decorator';
import {
  CmsEntryAdminResponseDto,
  CmsEntryDetailDto,
  CmsPublicDetailQueryDto,
  CmsPublicListQueryDto,
  CmsPublicListResponseDto,
  CreateCmsEntryDto,
  UpdateCmsEntryDto,
} from '../dto/cms-entry.dto';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import {
  toCmsEntryAdminResponseDto,
  toCmsEntryDetailDto,
  toCmsEntryListItemDto,
} from '../mappers/cms-http.mapper';
import { rethrowCmsServiceError } from '../utils/cms-http.util';

@ApiTags('cms')
@Controller('cms/entries')
export class CmsEntriesController {
  constructor(
    private readonly cmsService: CmsService,
    private readonly cmsAccessService: CmsAccessService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Public list published CMS entries',
    description:
      'Returns published, non-expired CMS entries. Anonymous callers see GLOBAL content only. Authenticated callers additionally see eligible parish content.',
  })
  @ApiOkResponse({ type: CmsPublicListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filter parameters' })
  async listPublic(
    @OptionalCurrentUser() authenticatedUser: AuthenticatedUser | null,
    @Query() query: CmsPublicListQueryDto,
  ): Promise<CmsPublicListResponseDto> {
    try {
      const allowedParishIds = authenticatedUser
        ? await this.cmsAccessService.listVisibleParishIds(authenticatedUser.userId)
        : [];

      const result = await this.cmsService.findPublicList({
        page: query.page,
        limit: query.limit,
        type: query.type,
        locale: query.locale,
        isFeatured: query.isFeatured,
        parishId: query.parishId,
        allowedParishIds,
      });

      return {
        items: result.items.map(toCmsEntryListItemDto),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowCmsServiceError(error);
    }
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get published CMS entry by slug',
    description:
      'Resolves published entry by slug. Defaults to GLOBAL scope. To resolve parish-scoped content, provide parishId (requires authentication and parish membership).',
  })
  @ApiParam({ name: 'slug', description: 'Entry URL slug' })
  @ApiOkResponse({ type: CmsEntryDetailDto })
  @ApiNotFoundResponse({ description: 'Entry not found or expired' })
  async getPublicBySlug(
    @OptionalCurrentUser() authenticatedUser: AuthenticatedUser | null,
    @Param('slug') slug: string,
    @Query() query: CmsPublicDetailQueryDto,
  ): Promise<CmsEntryDetailDto> {
    try {
      if (query.parishId && !authenticatedUser) {
        throw new NotFoundException('CMS entry not found.');
      }

      const allowedParishIds = authenticatedUser
        ? await this.cmsAccessService.listVisibleParishIds(authenticatedUser.userId)
        : [];

      const snapshot = await this.cmsService.findPublicBySlug(slug, {
        parishId: query.parishId,
        allowedParishIds,
      });

      if (!snapshot) {
        throw new NotFoundException('CMS entry not found.');
      }

      return toCmsEntryDetailDto(snapshot);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowCmsServiceError(error);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(CMS_MANAGE_PERMISSION)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new CMS entry',
    description:
      'Creates a CMS entry in DRAFT status (or SCHEDULED if future scheduledFor is specified). SuperAdmin can create GLOBAL or PARISH entries; ParishAdmin can only create for their own parish.',
  })
  @ApiCreatedResponse({ type: CmsEntryAdminResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid schedule' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or scope denied' })
  @ApiConflictResponse({ description: 'Slug collision within scope' })
  async create(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: CreateCmsEntryDto,
  ): Promise<CmsEntryAdminResponseDto> {
    try {
      await this.cmsAccessService.assertCanManageCmsScope(authenticatedUser.userId, {
        scopeType: dto.scopeType,
        parishId: dto.parishId,
      });

      const snapshot = await this.cmsService.createEntry({
        type: dto.type,
        scopeType: dto.scopeType,
        parishId: dto.parishId,
        slug: dto.slug,
        title: dto.title,
        summary: dto.summary,
        body: dto.body,
        locale: dto.locale,
        coverMediaAssetId: dto.coverMediaAssetId,
        isFeatured: dto.isFeatured,
        scheduledFor: dto.scheduledFor,
        expiresAt: dto.expiresAt,
        authorUserId: authenticatedUser.userId,
      });

      return toCmsEntryAdminResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCmsServiceError(error);
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(CMS_MANAGE_PERMISSION)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update an existing CMS entry',
    description:
      'Updates editable fields. Published entries cannot modify slug, type, or scope. Archived entries are read-only.',
  })
  @ApiParam({ name: 'id', description: 'Entry UUID' })
  @ApiOkResponse({ type: CmsEntryAdminResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Entry not found' })
  @ApiConflictResponse({ description: 'Lifecycle conflict or slug collision' })
  async update(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCmsEntryDto,
  ): Promise<CmsEntryAdminResponseDto> {
    try {
      const existing = await this.cmsService.getEntryById(id);
      await this.cmsAccessService.assertCanManageEntry(authenticatedUser.userId, existing);

      if (dto.scopeType !== undefined || dto.parishId !== undefined) {
        await this.cmsAccessService.assertCanManageCmsScope(authenticatedUser.userId, {
          scopeType: dto.scopeType ?? existing.scopeType,
          parishId: dto.parishId !== undefined ? dto.parishId : existing.parishId,
        });
      }

      const updated = await this.cmsService.updateEntry(id, {
        type: dto.type,
        scopeType: dto.scopeType,
        parishId: dto.parishId,
        slug: dto.slug,
        title: dto.title,
        summary: dto.summary,
        body: dto.body,
        locale: dto.locale,
        coverMediaAssetId: dto.coverMediaAssetId,
        isFeatured: dto.isFeatured,
        scheduledFor: dto.scheduledFor,
        expiresAt: dto.expiresAt,
        updatedByUserId: authenticatedUser.userId,
      });

      return toCmsEntryAdminResponseDto(updated);
    } catch (error: unknown) {
      rethrowCmsServiceError(error);
    }
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(CMS_MANAGE_PERMISSION)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Immediately publish a CMS entry',
    description: 'Transitions DRAFT or SCHEDULED entry to PUBLISHED. Sets publishedAt to UTC now.',
  })
  @ApiParam({ name: 'id', description: 'Entry UUID' })
  @ApiOkResponse({ type: CmsEntryAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Entry not found' })
  @ApiConflictResponse({ description: 'Already published or archived' })
  async publish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CmsEntryAdminResponseDto> {
    try {
      const existing = await this.cmsService.getEntryById(id);
      await this.cmsAccessService.assertCanManageEntry(authenticatedUser.userId, existing);

      const published = await this.cmsService.publishEntry(id, authenticatedUser.userId);
      return toCmsEntryAdminResponseDto(published);
    } catch (error: unknown) {
      rethrowCmsServiceError(error);
    }
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(CMS_MANAGE_PERMISSION)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Archive a CMS entry',
    description: 'Transitions entry to ARCHIVED terminal state. Entry disappears from public feeds.',
  })
  @ApiParam({ name: 'id', description: 'Entry UUID' })
  @ApiOkResponse({ type: CmsEntryAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Entry not found' })
  @ApiConflictResponse({ description: 'Already archived' })
  async archive(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CmsEntryAdminResponseDto> {
    try {
      const existing = await this.cmsService.getEntryById(id);
      await this.cmsAccessService.assertCanManageEntry(authenticatedUser.userId, existing);

      const archived = await this.cmsService.archiveEntry(id, authenticatedUser.userId);
      return toCmsEntryAdminResponseDto(archived);
    } catch (error: unknown) {
      rethrowCmsServiceError(error);
    }
  }
}
