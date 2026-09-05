import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { NOTIFICATIONS_READ_PERMISSION } from '../constants/notifications-permissions.constants';
import {
  NotificationInboxQueryDto,
  NotificationInboxResponseDto,
  NotificationListItemDto,
  NotificationMarkReadParamDto,
  NotificationReadAllResponseDto,
  NotificationUnreadCountResponseDto,
} from '../dto/notification.dto';
import { NotificationsService } from '../notifications.service';
import { rethrowNotificationServiceError } from '../utils/notifications-http.util';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('me/notifications')
export class NotificationsMeController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(NOTIFICATIONS_READ_PERMISSION)
  @ApiOperation({ summary: 'List in-app notifications for authenticated user' })
  @ApiOkResponse({
    description: 'Paginated user notification inbox',
    type: NotificationInboxResponseDto,
  })
  async listInbox(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationInboxQueryDto,
  ): Promise<NotificationInboxResponseDto> {
    try {
      const result = await this.notificationsService.listUserInbox(user.userId, {
        page: query.page,
        limit: query.limit,
        unreadOnly: query.unreadOnly,
        type: query.type,
        sourceType: query.sourceType,
      });

      return {
        items: result.items as NotificationListItemDto[],
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowNotificationServiceError(error);
    }
  }

  @Get('unread-count')
  @RequirePermissions(NOTIFICATIONS_READ_PERMISSION)
  @ApiOperation({ summary: 'Get unread notification count for authenticated user' })
  @ApiOkResponse({
    description: 'Unread notification count',
    type: NotificationUnreadCountResponseDto,
  })
  async getUnreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationUnreadCountResponseDto> {
    try {
      const unreadCount = await this.notificationsService.getUnreadCount(user.userId);
      return { unreadCount };
    } catch (error: unknown) {
      rethrowNotificationServiceError(error);
    }
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(NOTIFICATIONS_READ_PERMISSION)
  @ApiOperation({ summary: 'Mark all unread notifications as read for authenticated user' })
  @ApiOkResponse({
    description: 'Number of notifications marked as read',
    type: NotificationReadAllResponseDto,
  })
  async markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationReadAllResponseDto> {
    try {
      const updatedCount = await this.notificationsService.markAllRead(user.userId);
      return { updatedCount };
    } catch (error: unknown) {
      rethrowNotificationServiceError(error);
    }
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(NOTIFICATIONS_READ_PERMISSION)
  @ApiOperation({ summary: 'Mark a single notification as read for authenticated user' })
  @ApiOkResponse({
    description: 'Updated notification read state',
    type: NotificationListItemDto,
  })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param() param: NotificationMarkReadParamDto,
  ): Promise<NotificationListItemDto> {
    try {
      const item = await this.notificationsService.markRead(param.id, user.userId);
      return item as NotificationListItemDto;
    } catch (error: unknown) {
      rethrowNotificationServiceError(error);
    }
  }
}
