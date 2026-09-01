import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  LEARNING_PROGRESS_MANAGE_PERMISSION,
  LEARNING_PROGRESS_READ_PERMISSION,
} from '../constants/learning-progress-permissions.constants';
import {
  ClassLearningProgressQueryDto,
  LearningProgressQueryDto,
} from '../dto/learning-progress-query.dto';
import {
  ClassLearningProgressResponseDto,
  EnrollmentLearningProgressResponseDto,
  LessonProgressResponseDto,
  toClassLearningProgressResponseDto,
  toEnrollmentLearningProgressResponseDto,
  toLessonProgressResponseDto,
} from '../dto/learning-progress-response.dto';
import { PatchLessonProgressRequestDto } from '../dto/patch-lesson-progress-request.dto';
import { LearningProgressService } from '../services/learning-progress.service';
import { rethrowLearningProgressServiceError } from '../utils/learning-progress-http.util';

@ApiTags('learning-progress')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class LearningProgressController {
  constructor(private readonly learningProgressService: LearningProgressService) {}

  @Patch('enrollments/:enrollmentId/lessons/:canonicalLessonKey/progress')
  @RequirePermissions(LEARNING_PROGRESS_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Explicitly set lesson progress for a linked learner enrollment' })
  @ApiOkResponse({ type: LessonProgressResponseDto })
  @ApiForbiddenResponse({
    description: 'Caller cannot manage lesson progress for this enrollment.',
  })
  @ApiConflictResponse({ description: 'Backward lesson progress transition is not allowed.' })
  @ApiUnprocessableEntityResponse({
    description: 'Enrollment, curriculum, or canonical lesson validation failed.',
  })
  async patchLessonProgress(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('canonicalLessonKey', ParseUUIDPipe) canonicalLessonKey: string,
    @Body() request: PatchLessonProgressRequestDto,
  ): Promise<LessonProgressResponseDto> {
    try {
      const snapshot = await this.learningProgressService.patchLessonProgress({
        enrollmentId,
        canonicalLessonKey,
        status: request.status,
        actorUserId: authenticatedUser.userId,
      });

      return toLessonProgressResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowLearningProgressServiceError(error);
    }
  }

  @Get('enrollments/:enrollmentId/learning-progress')
  @RequirePermissions(LEARNING_PROGRESS_READ_PERMISSION)
  @ApiOperation({ summary: 'Get composed learning progress for a learner enrollment' })
  @ApiOkResponse({ type: EnrollmentLearningProgressResponseDto })
  @ApiForbiddenResponse({
    description: 'Caller cannot read learning progress for this enrollment.',
  })
  async getEnrollmentLearningProgress(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query() query: LearningProgressQueryDto,
  ): Promise<EnrollmentLearningProgressResponseDto> {
    try {
      const snapshot = await this.learningProgressService.getEnrollmentLearningProgress({
        enrollmentId,
        actorUserId: authenticatedUser.userId,
        curriculumId: query.curriculumId,
        canonicalLessonKey: query.canonicalLessonKey,
      });

      return toEnrollmentLearningProgressResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowLearningProgressServiceError(error);
    }
  }

  @Get('classes/:classId/learning-progress')
  @RequirePermissions(LEARNING_PROGRESS_READ_PERMISSION)
  @ApiOperation({ summary: 'Get aggregated learning progress for a class roster' })
  @ApiOkResponse({ type: ClassLearningProgressResponseDto })
  @ApiForbiddenResponse({ description: 'Caller cannot read class learning progress.' })
  async getClassLearningProgress(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: ClassLearningProgressQueryDto,
  ): Promise<ClassLearningProgressResponseDto> {
    try {
      const snapshot = await this.learningProgressService.getClassLearningProgress({
        classId,
        actorUserId: authenticatedUser.userId,
        page: query.page,
        limit: query.limit,
        curriculumId: query.curriculumId,
        canonicalLessonKey: query.canonicalLessonKey,
      });

      return toClassLearningProgressResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowLearningProgressServiceError(error);
    }
  }
}
