import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { EXAM_ATTEMPT_PERMISSION } from '../constants/exam-permissions.constants';
import {
  ExamAttemptResponseDto,
  LearnerExamAssignmentListResponseDto,
  StartExamAttemptRequestDto,
} from '../dto/exam-attempt.dto';
import {
  toExamAttemptResponseDto,
  toLearnerExamAssignmentListResponseDto,
} from '../mappers/exam-attempt-response.mapper';
import { ExamAttemptGenerationService } from '../services/exam-attempt-generation.service';
import { ExamAttemptQueryService } from '../services/exam-attempt-query.service';
import { ExamLearnerAssignmentService } from '../services/exam-learner-assignment.service';
import { rethrowExamServiceError } from '../utils/exam-http.util';

@ApiTags('exam-learner')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ExamLearnerController {
  constructor(
    private readonly examLearnerAssignmentService: ExamLearnerAssignmentService,
    private readonly examAttemptGenerationService: ExamAttemptGenerationService,
    private readonly examAttemptQueryService: ExamAttemptQueryService,
  ) {}

  @Get('enrollments/:enrollmentId/exam-assignments')
  @RequirePermissions(EXAM_ATTEMPT_PERMISSION)
  @ApiOperation({
    summary: 'List open exam assignments available to the linked learner enrollment',
  })
  @ApiOkResponse({ type: LearnerExamAssignmentListResponseDto })
  @ApiForbiddenResponse({ description: 'Caller is not the linked student for this enrollment.' })
  async listAvailableExamAssignments(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<LearnerExamAssignmentListResponseDto> {
    try {
      const result = await this.examLearnerAssignmentService.listAvailableAssignmentsForEnrollment(
        enrollmentId,
        authenticatedUser.userId,
      );

      return toLearnerExamAssignmentListResponseDto(result);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Post('enrollments/:enrollmentId/exam-attempts')
  @RequirePermissions(EXAM_ATTEMPT_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start or resume a formal exam attempt for a linked learner enrollment',
  })
  @ApiCreatedResponse({ type: ExamAttemptResponseDto })
  @ApiForbiddenResponse({ description: 'Caller is not the linked student for this enrollment.' })
  async startExamAttempt(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Headers('accept-language') acceptLanguageHeader: string | undefined,
    @Body() request: StartExamAttemptRequestDto,
  ): Promise<ExamAttemptResponseDto> {
    try {
      const snapshot = await this.examAttemptGenerationService.startAttempt({
        enrollmentId,
        examAssignmentId: request.examAssignmentId,
        actorUserId: authenticatedUser.userId,
        clientRequestId: request.clientRequestId,
        locale: request.locale,
        acceptLanguageHeader: acceptLanguageHeader ?? null,
      });

      return toExamAttemptResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('exam-attempts/:attemptId')
  @RequirePermissions(EXAM_ATTEMPT_PERMISSION)
  @ApiOperation({ summary: 'Get a formal exam attempt with pinned localized question delivery' })
  @ApiOkResponse({ type: ExamAttemptResponseDto })
  @ApiForbiddenResponse({ description: 'Caller is not the linked student for this attempt.' })
  async getExamAttempt(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<ExamAttemptResponseDto> {
    try {
      const snapshot = await this.examAttemptQueryService.getAttemptDelivery(
        attemptId,
        authenticatedUser.userId,
      );

      return toExamAttemptResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }
}
