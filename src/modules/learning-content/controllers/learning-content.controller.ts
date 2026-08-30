import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  LESSON_CONTENT_MANAGE_PERMISSION,
  LESSON_CONTENT_READ_PERMISSION,
} from '../constants/learning-content-permissions.constants';
import {
  LessonContentResponseDto,
  UpsertLessonContentRequestDto,
} from '../dto/upsert-lesson-content-request.dto';
import { toLearningContentResponseDto } from '../mappers/learning-content.mapper';
import { LearningContentService } from '../services/learning-content.service';
import { validateContentDocumentV1 } from '../utils/content-document-v1.validator';
import { rethrowLearningContentServiceError } from '../utils/learning-content-http.util';

@ApiTags('lesson-content')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class LearningContentController {
  constructor(
    private readonly learningContentService: LearningContentService,
    private readonly curriculumService: CurriculumService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Get('lessons/:lessonId/content')
  @RequirePermissions(LESSON_CONTENT_READ_PERMISSION)
  @ApiOperation({ summary: 'Get lesson content by lesson id' })
  @ApiOkResponse({ type: LessonContentResponseDto })
  async getLessonContent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
  ): Promise<LessonContentResponseDto> {
    try {
      const context = await this.curriculumService.getLessonCurriculumContext(lessonId);
      await this.parishScopeService.assertCanReadParishAsAdmin(
        authenticatedUser.userId,
        context.parishId,
      );

      const snapshot = await this.learningContentService.getLessonContent(lessonId);

      return toLearningContentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowLearningContentServiceError(error);
    }
  }

  @Put('lessons/:lessonId/content')
  @RequirePermissions(LESSON_CONTENT_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Upsert lesson content for a draft curriculum lesson' })
  @ApiOkResponse({ type: LessonContentResponseDto })
  async upsertLessonContent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('lessonId') lessonId: string,
    @Body() request: UpsertLessonContentRequestDto,
  ): Promise<LessonContentResponseDto> {
    try {
      const context = await this.curriculumService.getLessonCurriculumContext(lessonId);
      await this.parishScopeService.assertCanManageParish(
        authenticatedUser.userId,
        context.parishId,
      );

      const snapshot = await this.learningContentService.upsertLessonContent(lessonId, {
        document: validateContentDocumentV1(request.document),
      });

      return toLearningContentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowLearningContentServiceError(error);
    }
  }
}
