import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { EVENTS_READ_PERMISSION } from '../constants/events-permissions.constants';
import {
  MyEventRegistrationsQueryDto,
  MyEventRegistrationsResponseDto,
} from '../dto/event.dto';
import { EventsService } from '../events.service';
import { toMyEventRegistrationItemDto } from '../mappers/event-http.mapper';
import { EventAudienceResolver } from '../services/event-audience.resolver';
import { rethrowEventServiceError } from '../utils/event-http.util';

@ApiTags('me')
@Controller('me/event-registrations')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class EventRegistrationsMeController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly audienceResolver: EventAudienceResolver,
  ) {}

  @Get()
  @RequirePermissions(EVENTS_READ_PERMISSION)
  @ApiOperation({
    summary: 'List event registrations for current actor and linked children',
    description:
      'Returns paginated registrations for the authenticated caller (USER) and any active linked children (STUDENT) if caller is a parent.',
  })
  @ApiOkResponse({ type: MyEventRegistrationsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query filters' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async listMyRegistrations(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: MyEventRegistrationsQueryDto,
  ): Promise<MyEventRegistrationsResponseDto> {
    try {
      const linkedStudentIds = await this.audienceResolver.listLinkedStudentIdsForParent(
        authenticatedUser.userId,
      );

      const result = await this.eventsService.findMyRegistrations({
        page: query.page,
        limit: query.limit,
        status: query.status,
        from: query.from,
        to: query.to,
        userId: authenticatedUser.userId,
        linkedStudentIds,
      });

      return {
        items: result.items.map((item) =>
          toMyEventRegistrationItemDto(item.registration, item.event),
        ),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }
}
