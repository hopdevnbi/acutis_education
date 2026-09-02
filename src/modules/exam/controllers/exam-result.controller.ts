import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { EXAM_RESULT_READ_PERMISSION } from '../constants/exam-permissions.constants';
import {
  ExamAttemptResultReadResponseDto,
  ExamAssignmentAttemptSummaryListResponseDto,
} from '../dto/exam-attempt.dto';
import {
  toExamAttemptResultReadResponseDto,
  toExamAssignmentAttemptSummaryListResponseDto,
} from '../mappers/exam-attempt-response.mapper';
import { ExamAssignmentAttemptSummaryService } from '../services/exam-assignment-attempt-summary.service';
import { ExamAttemptResultQueryService } from '../services/exam-attempt-result-query.service';
import { rethrowExamServiceError } from '../utils/exam-http.util';

@ApiTags('exam-results')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ExamResultController {
  constructor(
    private readonly examAttemptResultQueryService: ExamAttemptResultQueryService,
    private readonly examAssignmentAttemptSummaryService: ExamAssignmentAttemptSummaryService,
  ) {}

  @Get('exam-attempts/:attemptId/result')
  @RequirePermissions(EXAM_RESULT_READ_PERMISSION)
  @ApiOperation({ summary: 'Read a finalized exam attempt result and review blocks' })
  @ApiOkResponse({ type: ExamAttemptResultReadResponseDto })
  @ApiForbiddenResponse({ description: 'Caller cannot read this attempt result.' })
  async getExamAttemptResult(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<ExamAttemptResultReadResponseDto> {
    try {
      const snapshot = await this.examAttemptResultQueryService.getAttemptResultRead(
        attemptId,
        authenticatedUser.userId,
      );

      return toExamAttemptResultReadResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('exam-assignments/:assignmentId/attempt-summaries')
  @RequirePermissions(EXAM_RESULT_READ_PERMISSION)
  @ApiOperation({ summary: 'List attempt summaries for a class exam assignment' })
  @ApiOkResponse({ type: ExamAssignmentAttemptSummaryListResponseDto })
  @ApiForbiddenResponse({ description: 'Caller cannot read assignment attempt summaries.' })
  async listExamAssignmentAttemptSummaries(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<ExamAssignmentAttemptSummaryListResponseDto> {
    try {
      const result =
        await this.examAssignmentAttemptSummaryService.listAttemptSummariesForAssignment(
          assignmentId,
          authenticatedUser.userId,
        );

      return toExamAssignmentAttemptSummaryListResponseDto(result);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }
}
