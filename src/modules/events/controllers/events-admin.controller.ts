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
import { EventAccessService } from '../access/event-access.service';
import {
  EVENTS_CHECKIN_PERMISSION,
  EVENTS_MANAGE_PERMISSION,
} from '../constants/events-permissions.constants';
import {
  CancelEventDto,
  CheckInEventDto,
  CreateEventDto,
  EventAdminListQueryDto,
  EventAdminListResponseDto,
  EventAdminResponseDto,
  EventAttendeeListQueryDto,
  EventAttendeeListResponseDto,
  EventRegistrationDto,
  UpdateEventDto,
} from '../dto/event.dto';
import { EventsService } from '../events.service';
import {
  toEventAdminResponseDto,
  toEventAttendeeListItemDto,
  toEventRegistrationDto,
} from '../mappers/event-http.mapper';
import { rethrowEventServiceError } from '../utils/event-http.util';

@ApiTags('admin-events')
@Controller('admin/events')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class EventsAdminController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventAccessService: EventAccessService,
  ) {}

  @Get()
  @RequirePermissions(EVENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'List events with administrative scope filtering',
    description:
      'List events based on caller scope. SuperAdmin sees all; ParishAdmin sees own parish; Catechist sees assigned class events.',
  })
  @ApiOkResponse({ type: EventAdminListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query filters' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Access denied or insufficient scope' })
  async listAdmin(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: EventAdminListQueryDto,
  ): Promise<EventAdminListResponseDto> {
    try {
      const actorScope = await this.eventAccessService.getAdminActorScope(
        authenticatedUser.userId,
      );

      const result = await this.eventsService.findAdminList({
        page: query.page,
        limit: query.limit,
        status: query.status,
        scopeType: query.scopeType,
        parishId: query.parishId,
        classId: query.classId,
        startsFrom: query.startsFrom,
        startsTo: query.startsTo,
        locale: query.locale,
        search: query.search,
        isSuperAdmin: actorScope.isSuperAdmin,
        adminParishIds: actorScope.adminParishIds,
        assignedClassIds: actorScope.assignedClassIds,
        isCatechistOnly: actorScope.isCatechistOnly,
      });

      return {
        items: result.items.map(toEventAdminResponseDto),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Post()
  @RequirePermissions(EVENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Create a new event draft',
    description:
      'Creates a new event in DRAFT status with optional audience targets. Enforces ownership scope and target validity.',
  })
  @ApiCreatedResponse({ type: EventAdminResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or invalid time window' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied or forbidden targeting' })
  @ApiConflictResponse({ description: 'Event code collision' })
  async create(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: CreateEventDto,
  ): Promise<EventAdminResponseDto> {
    try {
      await this.eventAccessService.assertCanCreateEvent(authenticatedUser.userId, {
        scopeType: dto.scopeType,
        parishId: dto.parishId,
        classId: dto.classId,
        targets: dto.targets,
      });

      const snapshot = await this.eventsService.createEvent({
        code: dto.code,
        title: dto.title,
        description: dto.description,
        summary: dto.summary,
        locale: dto.locale,
        scopeType: dto.scopeType,
        parishId: dto.parishId,
        classId: dto.classId,
        timezone: dto.timezone,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        venueName: dto.venueName,
        address: dto.address,
        coverMediaAssetId: dto.coverMediaAssetId,
        capacity: dto.capacity,
        isRegistrationRequired: dto.isRegistrationRequired,
        registrationDeadline: dto.registrationDeadline,
        targets: dto.targets,
        authorUserId: authenticatedUser.userId,
      });

      return toEventAdminResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Patch(':id')
  @RequirePermissions(EVENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Update event metadata',
    description:
      'Updates event fields. If published, ownership scope and targets are immutable, and significant changes bump version and emit EventUpdatedEvent.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventAdminResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiConflictResponse({ description: 'Lifecycle conflict, immutable fields violated, or capacity below registrations' })
  async update(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventAdminResponseDto> {
    try {
      const existing = await this.eventsService.getEventById(id);
      await this.eventAccessService.assertCanManageEvent(
        authenticatedUser.userId,
        existing.event,
        dto.targets,
      );

      const updated = await this.eventsService.updateEvent(id, {
        title: dto.title,
        description: dto.description,
        summary: dto.summary,
        locale: dto.locale,
        scopeType: dto.scopeType,
        parishId: dto.parishId,
        classId: dto.classId,
        timezone: dto.timezone,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        venueName: dto.venueName,
        address: dto.address,
        coverMediaAssetId: dto.coverMediaAssetId,
        capacity: dto.capacity,
        isRegistrationRequired: dto.isRegistrationRequired,
        registrationDeadline: dto.registrationDeadline,
        targets: dto.targets,
        updatedByUserId: authenticatedUser.userId,
      });

      return toEventAdminResponseDto(updated);
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Post(':id/publish')
  @RequirePermissions(EVENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Publish an event draft',
    description:
      'Transitions event DRAFT to PUBLISHED, sets version=1, and emits EventPublishedEvent post-commit.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiConflictResponse({ description: 'Event not in DRAFT status' })
  async publish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EventAdminResponseDto> {
    try {
      const existing = await this.eventsService.getEventById(id);
      await this.eventAccessService.assertCanPublishEvent(
        authenticatedUser.userId,
        existing.event,
        existing.targets,
      );

      const published = await this.eventsService.publishEvent(id, authenticatedUser.userId);
      return toEventAdminResponseDto(published);
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Post(':id/cancel')
  @RequirePermissions(EVENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Cancel a published event',
    description:
      'Transitions event PUBLISHED to CANCELLED, records reason, bumps version, and emits EventCancelledEvent post-commit.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventAdminResponseDto })
  @ApiBadRequestResponse({ description: 'Missing cancellation reason' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiConflictResponse({ description: 'Event not in PUBLISHED status' })
  async cancel(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelEventDto,
  ): Promise<EventAdminResponseDto> {
    try {
      const existing = await this.eventsService.getEventById(id);
      await this.eventAccessService.assertCanCancelEvent(
        authenticatedUser.userId,
        existing.event,
      );

      const cancelled = await this.eventsService.cancelEvent(
        id,
        dto.cancellationReason,
        authenticatedUser.userId,
      );
      return toEventAdminResponseDto(cancelled);
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Post(':id/complete')
  @RequirePermissions(EVENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Complete a published event',
    description:
      'Transitions event PUBLISHED to COMPLETED. Does not emit notification and does not auto-convert registrations.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiConflictResponse({ description: 'Event not in PUBLISHED status' })
  async complete(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EventAdminResponseDto> {
    try {
      const existing = await this.eventsService.getEventById(id);
      await this.eventAccessService.assertCanCompleteEvent(
        authenticatedUser.userId,
        existing.event,
      );

      const completed = await this.eventsService.completeEvent(id, authenticatedUser.userId);
      return toEventAdminResponseDto(completed);
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Post(':id/archive')
  @RequirePermissions(EVENTS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Archive an event',
    description:
      'Transitions event to ARCHIVED terminal state. Retains registrations and historical records.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventAdminResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiConflictResponse({ description: 'Cannot archive from current state' })
  async archive(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EventAdminResponseDto> {
    try {
      const existing = await this.eventsService.getEventById(id);
      await this.eventAccessService.assertCanArchiveEvent(
        authenticatedUser.userId,
        existing.event,
      );

      const archived = await this.eventsService.archiveEvent(id, authenticatedUser.userId);
      return toEventAdminResponseDto(archived);
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Post(':id/checkin')
  @RequirePermissions(EVENTS_CHECKIN_PERMISSION)
  @ApiOperation({
    summary: 'Check in a registered attendee by registration ID',
    description:
      'Marks an active event registration as ATTENDED with checkedInAt timestamp. Idempotent return (200 OK) if already checked in.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventRegistrationDto })
  @ApiBadRequestResponse({ description: 'Invalid registration ID' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Registration or event not found' })
  @ApiConflictResponse({ description: 'Registration cannot be checked in (cancelled or no-show)' })
  async checkIn(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CheckInEventDto,
  ): Promise<EventRegistrationDto> {
    try {
      const existing = await this.eventsService.getEventById(id);
      await this.eventAccessService.assertCanCheckIn(
        authenticatedUser.userId,
        existing.event,
      );

      const registration = await this.eventsService.checkIn(id, dto.registrationId);
      return toEventRegistrationDto(registration);
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Get(':id/registrations')
  @RequirePermissions(EVENTS_CHECKIN_PERMISSION)
  @ApiOperation({
    summary: 'List event attendee registrations for check-in lookup',
    description:
      'Returns paginated registrations for staff check-in lookup. Resolves student display names without leaking contact PII.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventAttendeeListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Scope denied' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  async listAttendees(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: EventAttendeeListQueryDto,
  ): Promise<EventAttendeeListResponseDto> {
    try {
      const existing = await this.eventsService.getEventById(id);
      await this.eventAccessService.assertCanCheckIn(
        authenticatedUser.userId,
        existing.event,
      );

      const result = await this.eventsService.findAttendeeList({
        eventId: id,
        page: query.page,
        limit: query.limit,
        status: query.status,
        search: query.search,
      });

      return {
        items: result.items.map(toEventAttendeeListItemDto),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }
}
