import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { NOTIFICATIONS_DEVICES_PERMISSION } from '../constants/notifications-permissions.constants';
import {
  NotificationDeviceParamDto,
  NotificationDeviceResponseDto,
  RegisterNotificationDeviceDto,
} from '../dto/notification.dto';
import { NotificationsService } from '../notifications.service';
import { rethrowNotificationServiceError } from '../utils/notifications-http.util';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('me/notification-devices')
export class NotificationDevicesMeController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermissions(NOTIFICATIONS_DEVICES_PERMISSION)
  @ApiOperation({ summary: 'Register or update a notification device for authenticated user' })
  @ApiCreatedResponse({
    description: 'Registered device details (token omitted for privacy)',
    type: NotificationDeviceResponseDto,
  })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterNotificationDeviceDto,
  ): Promise<NotificationDeviceResponseDto> {
    try {
      const device = await this.notificationsService.registerDevice({
        userId: user.userId,
        platform: dto.platform,
        provider: dto.provider,
        token: dto.token,
        appVersion: dto.appVersion,
        locale: dto.locale,
      });

      // Data minimization / privacy: do not return token in response
      return {
        id: device.id,
        platform: device.platform,
        provider: device.provider,
        isActive: device.isActive,
        appVersion: device.appVersion,
        locale: device.locale,
        lastSeenAt: device.lastSeenAt,
        createdAt: device.createdAt,
      };
    } catch (error: unknown) {
      rethrowNotificationServiceError(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(NOTIFICATIONS_DEVICES_PERMISSION)
  @ApiOperation({ summary: 'Deactivate a notification device for authenticated user' })
  @ApiNoContentResponse({ description: 'Device deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Device not found or not owned by caller' })
  async deactivateDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param() param: NotificationDeviceParamDto,
  ): Promise<void> {
    try {
      await this.notificationsService.deactivateDeviceById(param.id, user.userId);
    } catch (error: unknown) {
      rethrowNotificationServiceError(error);
    }
  }
}
