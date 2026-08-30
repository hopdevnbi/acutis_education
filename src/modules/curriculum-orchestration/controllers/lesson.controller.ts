import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  CURRICULUM_MANAGE_PERMISSION,
  CURRICULUM_READ_PERMISSION,
} from '../../curriculum/constants/curriculum-permissions.constants';
import { CreateLessonRequestDto } from '../../curriculum/dto/create-lesson-request.dto';
import { LessonListResponseDto } from '../../curriculum/dto/lesson-list-response.dto';
import { LessonResponseDto } from '../../curriculum/dto/lesson-response.dto';
import { ReorderLessonsRequestDto } from '../../curriculum/dto/reorder-lessons-request.dto';
import { UpdateLessonRequestDto } from '../../curriculum/dto/update-lesson-request.dto';
import {
  toLessonListResponseDto,
  toLessonResponseDto,
} from '../../curriculum/mappers/curriculum-response.mapper';
import { LessonService } from '../../curriculum/services/lesson.service';
import { TopicService } from '../../curriculum/services/topic.service';
import { rethrowCurriculumServiceError } from '../../curriculum/utils/curriculum-http.util';
import { CurriculumVersionOrchestrationService } from '../services/curriculum-version-orchestration.service';

@ApiTags('curriculum-lessons')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class LessonController {
  constructor(
    private readonly lessonService: LessonService,
    private readonly topicService: TopicService,
    private readonly parishScopeService: ParishScopeService,
    private readonly curriculumVersionOrchestrationService: CurriculumVersionOrchestrationService,
  ) {}

  @Post('topics/:topicId/lessons')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lesson in a draft curriculum topic' })
  @ApiCreatedResponse({ type: LessonResponseDto })
  async createLesson(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('topicId') topicId: string,
    @Body() request: CreateLessonRequestDto,
  ): Promise<LessonResponseDto> {
    try {
      const parishId = await this.topicService.getTopicParishId(topicId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.lessonService.createLesson(topicId, {
        code: request.code,
        title: request.title,
        summary: request.summary,
        estimatedDurationMinutes: request.estimatedDurationMinutes,
        sortOrder: request.sortOrder,
      });

      return toLessonResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('topics/:topicId/lessons')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'List lessons for a curriculum topic' })
  @ApiOkResponse({ type: LessonListResponseDto })
  async listLessonsByTopic(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('topicId') topicId: string,
  ): Promise<LessonListResponseDto> {
    try {
      const parishId = await this.topicService.getTopicParishId(topicId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.lessonService.listLessonsByTopic(topicId);

      return toLessonListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Patch('topics/:topicId/lessons/reorder')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Reorder lessons within a draft curriculum topic' })
  @ApiOkResponse({ type: LessonListResponseDto })
  async reorderLessons(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('topicId') topicId: string,
    @Body() request: ReorderLessonsRequestDto,
  ): Promise<LessonListResponseDto> {
    try {
      const parishId = await this.topicService.getTopicParishId(topicId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshots = await this.lessonService.reorderLessons(topicId, {
        lessonIds: request.lessonIds,
      });

      return toLessonListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('lessons/:id')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a lesson by id' })
  @ApiOkResponse({ type: LessonResponseDto })
  async getLessonById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') lessonId: string,
  ): Promise<LessonResponseDto> {
    try {
      const parishId = await this.lessonService.getLessonParishId(lessonId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.lessonService.getLessonById(lessonId);

      return toLessonResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Patch('lessons/:id')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update a lesson in a draft curriculum version' })
  @ApiOkResponse({ type: LessonResponseDto })
  async updateLesson(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') lessonId: string,
    @Body() request: UpdateLessonRequestDto,
  ): Promise<LessonResponseDto> {
    if (
      request.code === undefined &&
      request.title === undefined &&
      request.summary === undefined &&
      request.estimatedDurationMinutes === undefined
    ) {
      throw new BadRequestException('At least one lesson field must be provided for update.');
    }

    try {
      const parishId = await this.lessonService.getLessonParishId(lessonId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.lessonService.updateLesson(lessonId, {
        code: request.code,
        title: request.title,
        summary: request.summary,
        estimatedDurationMinutes: request.estimatedDurationMinutes,
      });

      return toLessonResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Delete('lessons/:id')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson and its content from a draft curriculum version' })
  @ApiNoContentResponse({ description: 'Lesson deleted' })
  async deleteLesson(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') lessonId: string,
  ): Promise<void> {
    try {
      const parishId = await this.lessonService.getLessonParishId(lessonId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      await this.curriculumVersionOrchestrationService.deleteLessonWithContent(lessonId);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }
}
