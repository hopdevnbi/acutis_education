import {
  Body,
  Controller,
  Get,
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
import { AnnouncementAccessService } from '../access/announcement-access.service';
import { AnnouncementsService } from '../announcements.service';
import {
  ANNOUNCEMENTS_MANAGE_PERMISSION,
  ANNOUNCEMENTS_PUBLISH_PERMISSION,
} from '../constants/announcements-permissions.constants';
import {
  AnnouncementAdminListQueryDto,
  AnnouncementAdminListResponseDto,
  AnnouncementAdminResponseDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../dto/announcement.dto';
import { toAnnouncementAdminResponseDto } from '../mappers/announcement-http.mapper';
import { rethrowAnnouncementServiceError } from '../utils/announcement-http.util';

@ApiTags('admin-announcements')
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class AnnouncementsAdminController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly announcementAccessService: AnnouncementAccessService,
  ) {}

  @Get()
  @RequirePermissions(ANNOUNCEMENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Staff list announcements with scope filtering',
    description:
      'List announcements based on actor scope. SuperAdmin sees all; ParishAdmin sees own parish; Catechist sees assigned class announcements.',
  })
  @ApiOkResponse({ type: AnnouncementAdminListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filter parameters' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or scope denied' })
  async listAdmin(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: AnnouncementAdminListQueryDto,
  ): Promise<AnnouncementAdminListResponseDto> {
    try {
      const actorScope = await this.announcementAccessService.getAdminActorScope(
        authenticatedUser.userId,
      );

      const result = await this.announcementsService.findAdminList({
        page: query.page,
        limit: query.limit,
        status: query.status,
        priority: query.priority,
        scopeType: query.scopeType,
        parishId: query.parishId,
        targetType: query.targetType,
        classId: query.classId,
        locale: query.locale,
        search: query.search,
        isSuperAdmin: actorScope.isSuperAdmin,
        adminParishIds: actorScope.adminParishIds,
        assignedClassIds: actorScope.assignedClassIds,
        isCatechistOnly: actorScope.isCatechistOnly,
      });

      return {
        items: result.items.map(toAnnouncementAdminResponseDto),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowAnnouncementServiceError(error);
    }
  }

  @Post()
  @RequirePermissions(ANNOUNCEMENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Create announcement draft',
    description:
      'Creates a new announcement in DRAFT status. Validates audience targets and ownership scope.',
  })
  @ApiCreatedResponse({ type: AnnouncementAdminResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied or forbidden targeting' })
  async create(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: CreateAnnouncementDto,
  ): Promise<AnnouncementAdminResponseDto> {
    try {
      await this.announcementAccessService.assertCanCreateAnnouncement(
        authenticatedUser.userId,
        {
          scopeType: dto.scopeType,
          parishId: dto.parishId,
          targets: dto.targets,
        },
      );

      const snapshot = await this.announcementsService.createAnnouncement({
        title: dto.title,
        body: dto.body,
        summary: dto.summary,
        locale: dto.locale,
        priority: dto.priority,
        scopeType: dto.scopeType,
        parishId: dto.parishId,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        isPinned: dto.isPinned,
        coverMediaAssetId: dto.coverMediaAssetId,
        targets: dto.targets,
        authorUserId: authenticatedUser.userId,
      });

      return toAnnouncementAdminResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAnnouncementServiceError(error);
    }
  }

  @Patch(':id')
  @RequirePermissions(ANNOUNCEMENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Update announcement',
    description:
      'Updates editable fields. If published, audience targets and scope cannot be modified.',
  })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiOkResponse({ type: AnnouncementAdminResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Announcement not found' })
  @ApiConflictResponse({ description: 'Lifecycle conflict (published target/scope immutability or archived)' })
  async update(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementAdminResponseDto> {
    try {
      const existing = await this.announcementsService.getAnnouncementById(id);
      await this.announcementAccessService.assertCanManageAnnouncement(
        authenticatedUser.userId,
        existing.announcement,
        dto.targets,
      );

      const updated = await this.announcementsService.updateAnnouncement(id, {
        title: dto.title,
        body: dto.body,
        summary: dto.summary,
        locale: dto.locale,
        priority: dto.priority,
        scopeType: dto.scopeType,
        parishId: dto.parishId,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        isPinned: dto.isPinned,
        coverMediaAssetId: dto.coverMediaAssetId,
        targets: dto.targets,
        updatedByUserId: authenticatedUser.userId,
      });

      return toAnnouncementAdminResponseDto(updated);
    } catch (error: unknown) {
      rethrowAnnouncementServiceError(error);
    }
  }

  @Post(':id/publish')
  @RequirePermissions(ANNOUNCEMENTS_PUBLISH_PERMISSION)
  @ApiOperation({
    summary: 'Publish announcement',
    description:
      'Transitions DRAFT to PUBLISHED and emits neutral AnnouncementPublishedEvent post-commit.',
  })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiOkResponse({ type: AnnouncementAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied or targets invalid' })
  @ApiNotFoundResponse({ description: 'Announcement not found' })
  @ApiConflictResponse({ description: 'Already published or archived' })
  async publish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AnnouncementAdminResponseDto> {
    try {
      const existing = await this.announcementsService.getAnnouncementById(id);
      await this.announcementAccessService.assertCanPublishAnnouncement(
        authenticatedUser.userId,
        existing.announcement,
        existing.targets,
      );

      const published = await this.announcementsService.publishAnnouncement(
        id,
        authenticatedUser.userId,
      );

      return toAnnouncementAdminResponseDto(published);
    } catch (error: unknown) {
      rethrowAnnouncementServiceError(error);
    }
  }

  @Post(':id/archive')
  @RequirePermissions(ANNOUNCEMENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Archive announcement',
    description: 'Transitions announcement to ARCHIVED terminal state. Does not emit notification event.',
  })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiOkResponse({ type: AnnouncementAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Announcement not found' })
  @ApiConflictResponse({ description: 'Already archived' })
  async archive(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AnnouncementAdminResponseDto> {
    try {
      const existing = await this.announcementsService.getAnnouncementById(id);
      await this.announcementAccessService.assertCanArchiveAnnouncement(
        authenticatedUser.userId,
        existing.announcement,
      );

      const archived = await this.announcementsService.archiveAnnouncement(
        id,
        authenticatedUser.userId,
      );

      return toAnnouncementAdminResponseDto(archived);
    } catch (error: unknown) {
      rethrowAnnouncementServiceError(error);
    }
  }
}
