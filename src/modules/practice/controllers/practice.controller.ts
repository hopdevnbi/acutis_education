import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { buildContextualMediaContentHeaders } from '../../curriculum-delivery/utils/contextual-media-response.util';
import {
  PRACTICE_MANAGE_PERMISSION,
  PRACTICE_READ_PERMISSION,
} from '../constants/practice-permissions.constants';
import { CreatePracticeSessionRequestDto } from '../dto/create-practice-session-request.dto';
import {
  PracticeSessionResponseDto,
  toPracticeSessionResponseDto,
} from '../dto/practice-session-response.dto';
import { PracticeService } from '../services/practice.service';
import { rethrowPracticeServiceError } from '../utils/practice-http.util';

@ApiTags('practice')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Post('enrollments/:enrollmentId/practice-sessions')
  @RequirePermissions(PRACTICE_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Create a learner practice session for a linked enrollment' })
  @ApiCreatedResponse({ type: PracticeSessionResponseDto })
  @ApiForbiddenResponse({ description: 'Caller is not linked to the learner enrollment.' })
  @ApiUnprocessableEntityResponse({
    description: 'Enrollment, curriculum, or question selection preconditions failed.',
  })
  async createPracticeSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() request: CreatePracticeSessionRequestDto,
  ): Promise<PracticeSessionResponseDto> {
    try {
      const snapshot = await this.practiceService.createSession({
        enrollmentId,
        actorUserId: authenticatedUser.userId,
        clientRequestId: request.clientRequestId,
        locale: request.locale,
        curriculumId: request.curriculumId,
        canonicalLessonKey: request.canonicalLessonKey,
        tagIds: request.tagIds,
        tagCodes: request.tagCodes,
        questionTypes: request.questionTypes,
        difficulty: request.difficulty,
        questionCount: request.questionCount,
        randomizeQuestions: request.randomizeQuestions,
        randomizeOptions: request.randomizeOptions,
      });

      return toPracticeSessionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowPracticeServiceError(error);
    }
  }

  @Get('practice-sessions/:sessionId')
  @RequirePermissions(PRACTICE_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a learner practice session snapshot' })
  @ApiOkResponse({ type: PracticeSessionResponseDto })
  @ApiForbiddenResponse({ description: 'Caller cannot read this learner session.' })
  async getPracticeSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<PracticeSessionResponseDto> {
    try {
      const snapshot = await this.practiceService.getSession(authenticatedUser.userId, sessionId);

      return toPracticeSessionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowPracticeServiceError(error);
    }
  }

  @Patch('practice-sessions/:sessionId/abandon')
  @RequirePermissions(PRACTICE_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Abandon an in-progress learner practice session' })
  @ApiOkResponse({ type: PracticeSessionResponseDto })
  async abandonPracticeSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<PracticeSessionResponseDto> {
    try {
      const snapshot = await this.practiceService.abandonSession(
        authenticatedUser.userId,
        sessionId,
      );

      return toPracticeSessionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowPracticeServiceError(error);
    }
  }

  @Get('practice-sessions/:sessionId/questions/:sessionQuestionId/media/:assetId/content')
  @RequirePermissions(PRACTICE_READ_PERMISSION)
  @ApiOperation({ summary: 'Stream contextual media referenced by a practice session question' })
  @ApiOkResponse({ description: 'Binary media content stream.' })
  @ApiNotFoundResponse({ description: 'Session question or media asset was not found.' })
  async getPracticeSessionQuestionMediaContent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('sessionQuestionId', ParseUUIDPipe) sessionQuestionId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    try {
      const content = await this.practiceService.openSessionQuestionMediaContent(
        authenticatedUser.userId,
        sessionId,
        sessionQuestionId,
        assetId,
      );
      const headers = buildContextualMediaContentHeaders(
        content.snapshot.originalFileName,
        content.snapshot.mimeType,
        content.contentLength,
      );

      for (const [headerName, headerValue] of Object.entries(headers)) {
        response.setHeader(headerName, headerValue);
      }

      return new StreamableFile(content.body);
    } catch (error: unknown) {
      rethrowPracticeServiceError(error);
    }
  }
}
