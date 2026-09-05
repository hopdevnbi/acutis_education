import {
  Body,
  Controller,
  ForbiddenException,
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
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import {
  EVENTS_READ_PERMISSION,
  EVENTS_REGISTER_PERMISSION,
} from '../constants/events-permissions.constants';
import {
  CancelRegistrationDto,
  EventDetailDto,
  EventListItemDto,
  EventListQueryDto,
  EventListResponseDto,
  EventRegistrationDto,
  RegisterEventDto,
} from '../dto/event.dto';
import { EventsService } from '../events.service';
import {
  toEventDetailDto,
  toEventListItemDto,
  toEventRegistrationDto,
} from '../mappers/event-http.mapper';
import { EventAudienceResolver } from '../services/event-audience.resolver';
import { buildEventRegistrantKey } from '../utils/event-key.util';
import { rethrowEventServiceError } from '../utils/event-http.util';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly audienceResolver: EventAudienceResolver,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
  ) {}

  @Get()
  @RequirePermissions(EVENTS_READ_PERMISSION)
  @ApiOperation({
    summary: 'List visible published events for caller',
    description:
      'Returns active published events matching the caller audience (targets or ownership fallback scope). Authenticated only.',
  })
  @ApiOkResponse({ type: EventListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query filters' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async list(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: EventListQueryDto,
  ): Promise<EventListResponseDto> {
    try {
      const audienceKeys = await this.audienceResolver.resolveAudienceKeys(
        authenticatedUser.userId,
      );

      const result = await this.eventsService.findUserList({
        page: query.page,
        limit: query.limit,
        from: query.from,
        to: query.to,
        locale: query.locale,
        search: query.search,
        audienceKeys,
        userId: authenticatedUser.userId,
      });

      return {
        items: result.items.map((item) => toEventListItemDto(item.event, item.isRegistered)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error: unknown) {
      rethrowEventServiceError(error);
    }
  }

  @Get(':id')
  @RequirePermissions(EVENTS_READ_PERMISSION)
  @ApiOperation({
    summary: 'Get event detail by ID',
    description:
      'Returns full event detail and caller active registration status. Requires audience eligibility.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventDetailDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'Event not found or not visible to caller' })
  async getDetail(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EventDetailDto> {
    try {
      const audienceKeys = await this.audienceResolver.resolveAudienceKeys(
        authenticatedUser.userId,
      );
      const linkedStudentIds = await this.audienceResolver.listLinkedStudentIdsForParent(
        authenticatedUser.userId,
      );

      const result = await this.eventsService.getUserEventDetail(
        id,
        authenticatedUser.userId,
        audienceKeys,
        linkedStudentIds,
      );

      if (!result) {
        throw new NotFoundException('Event not found.');
      }

      return toEventDetailDto(result.event, result.currentUserRegistration);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowEventServiceError(error);
    }
  }

  @Post(':id/registrations')
  @RequirePermissions(EVENTS_REGISTER_PERMISSION)
  @ApiOperation({
    summary: 'Register for an event (self or linked child)',
    description:
      'Registers caller (USER:<userId>) or their linked child (STUDENT:<studentId>). Enforces capacity transaction safety and audience eligibility.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiCreatedResponse({ type: EventRegistrationDto })
  @ApiBadRequestResponse({ description: 'Event not accepting registrations or deadline passed' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Not authorized or child not linked' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiConflictResponse({ description: 'Already registered or capacity reached' })
  async register(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RegisterEventDto,
  ): Promise<EventRegistrationDto> {
    try {
      const audienceKeys = await this.audienceResolver.resolveAudienceKeys(
        authenticatedUser.userId,
      );
      const linkedStudentIds = await this.audienceResolver.listLinkedStudentIdsForParent(
        authenticatedUser.userId,
      );

      const detail = await this.eventsService.getUserEventDetail(
        id,
        authenticatedUser.userId,
        audienceKeys,
        linkedStudentIds,
      );

      if (!detail) {
        throw new NotFoundException('Event not found.');
      }

      let enrollmentId: string | null = null;

      if (dto.studentId) {
        // Child registration: verify Parent role and active guardian link
        const isParent = authenticatedUser.roles.includes('PARENT');
        if (!isParent) {
          throw new ForbiddenException('Only parents can register students for events.');
        }

        try {
          await this.studentGuardianService.assertGuardianLinked(
            authenticatedUser.userId,
            dto.studentId,
          );
        } catch {
          throw new ForbiddenException('Not an active guardian of the specified student.');
        }

        const targets = await this.eventsService.listTargets(detail.event.id);
        const eligible = await this.audienceResolver.isChildEligibleForEvent(
          dto.studentId,
          detail.event,
          targets,
        );

        if (!eligible) {
          throw new ForbiddenException('Student is not eligible for this event.');
        }

        const activeEnrollments =
          await this.enrollmentQueryService.listActiveEnrollmentsByStudentIds([dto.studentId]);
        if (activeEnrollments.length > 0) {
          enrollmentId = activeEnrollments[0].id;
        }
      }

      const registration = await this.eventsService.register(
        detail.event,
        authenticatedUser.userId,
        dto.studentId,
        enrollmentId,
      );

      return toEventRegistrationDto(registration);
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      rethrowEventServiceError(error);
    }
  }

  @Post(':id/registrations/cancel')
  @RequirePermissions(EVENTS_REGISTER_PERMISSION)
  @ApiOperation({
    summary: 'Cancel event registration (self or linked child)',
    description:
      'Cancels active registration for caller or their linked child. Idempotent return (200 OK) if already cancelled.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiOkResponse({ type: EventRegistrationDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Not authorized or child not linked' })
  @ApiNotFoundResponse({ description: 'Registration not found' })
  @ApiConflictResponse({ description: 'Cannot cancel attended or no-show registration' })
  async cancelRegistration(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelRegistrationDto,
  ): Promise<EventRegistrationDto> {
    try {
      let registrantKey: string;

      if (dto.studentId) {
        const isParent = authenticatedUser.roles.includes('PARENT');
        if (!isParent) {
          throw new ForbiddenException('Only parents can cancel student registrations.');
        }

        try {
          await this.studentGuardianService.assertGuardianLinked(
            authenticatedUser.userId,
            dto.studentId,
          );
        } catch {
          throw new ForbiddenException('Not an active guardian of the specified student.');
        }

        registrantKey = buildEventRegistrantKey({
          userId: authenticatedUser.userId,
          studentId: dto.studentId,
        });
      } else {
        registrantKey = buildEventRegistrantKey({
          userId: authenticatedUser.userId,
        });
      }

      const registration = await this.eventsService.cancelRegistration(id, registrantKey);
      return toEventRegistrationDto(registration);
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      rethrowEventServiceError(error);
    }
  }
}
