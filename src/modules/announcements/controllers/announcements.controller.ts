import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AnnouncementsService } from '../announcements.service';
import { ANNOUNCEMENTS_READ_PERMISSION } from '../constants/announcements-permissions.constants';
import {
  AnnouncementDetailDto,
  AnnouncementFeedQueryDto,
  AnnouncementFeedResponseDto,
  DismissAnnouncementResponseDto,
} from '../dto/announcement.dto';
import {
  toAnnouncementDetailDto,
  toAnnouncementListItemDto,
} from '../mappers/announcement-http.mapper';
import { AnnouncementAudienceResolver } from '../services/announcement-audience.resolver';
import { rethrowAnnouncementServiceError } from '../utils/announcement-http.util';

@ApiTags('announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly audienceResolver: AnnouncementAudienceResolver,
  ) {}

  @Get()
  @RequirePermissions(ANNOUNCEMENTS_READ_PERMISSION)
  @ApiOperation({
    summary: 'Get active visible announcements feed for actor',
    description:
      'Returns active published announcements targeted to the caller (global, parish, enrolled/assigned classes, or roles). Excludes dismissed announcements. Does not write state rows on list.',
  })
  @ApiOkResponse({ type: AnnouncementFeedResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filter parameters' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async getFeed(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: AnnouncementFeedQueryDto,
  ): Promise<AnnouncementFeedResponseDto> {
    try {
      const audienceKeys = await this.audienceResolver.resolveAudienceKeys(
        authenticatedUser.userId,
      );

      const result = await this.announcementsService.findUserFeed({
        page: query.page,
        limit: query.limit,
        priority: query.priority,
        locale: query.locale,
        unreadOnly: query.unreadOnly,
        audienceKeys,
        userId: authenticatedUser.userId,
      });

      return {
        items: result.items.map(toAnnouncementListItemDto),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowAnnouncementServiceError(error);
    }
  }

  @Get(':id')
  @RequirePermissions(ANNOUNCEMENTS_READ_PERMISSION)
  @ApiOperation({
    summary: 'Get announcement detail by ID',
    description:
      'Returns full announcement detail including body. Caller must be in the targeted audience. Lazily marks the announcement as seen and read.',
  })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiOkResponse({ type: AnnouncementDetailDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Announcement not found or not visible' })
  async getDetail(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AnnouncementDetailDto> {
    try {
      const audienceKeys = await this.audienceResolver.resolveAudienceKeys(
        authenticatedUser.userId,
      );

      const snapshot = await this.announcementsService.getUserFeedItemById(
        id,
        authenticatedUser.userId,
        audienceKeys,
      );

      if (!snapshot) {
        throw new NotFoundException('Announcement not found.');
      }

      return toAnnouncementDetailDto(snapshot);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowAnnouncementServiceError(error);
    }
  }

  @Post(':id/dismiss')
  @RequirePermissions(ANNOUNCEMENTS_READ_PERMISSION)
  @ApiOperation({
    summary: 'Dismiss announcement for actor',
    description:
      'Dismisses announcement so it no longer appears in the feed. Idempotent. Implies read.',
  })
  @ApiParam({ name: 'id', description: 'Announcement UUID' })
  @ApiOkResponse({ type: DismissAnnouncementResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Announcement not found or not visible' })
  async dismiss(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DismissAnnouncementResponseDto> {
    try {
      const audienceKeys = await this.audienceResolver.resolveAudienceKeys(
        authenticatedUser.userId,
      );

      const snapshot = await this.announcementsService.getUserFeedItemById(
        id,
        authenticatedUser.userId,
        audienceKeys,
      );

      if (!snapshot) {
        throw new NotFoundException('Announcement not found.');
      }

      const state = await this.announcementsService.dismissAnnouncement(
        id,
        authenticatedUser.userId,
      );

      return {
        announcementId: id,
        dismissedAt: state.dismissedAt ? state.dismissedAt.toISOString() : new Date().toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowAnnouncementServiceError(error);
    }
  }
}
