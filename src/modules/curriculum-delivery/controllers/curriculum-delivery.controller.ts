import { Controller, Get, Headers, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CURRICULUM_READ_PERMISSION } from '../../curriculum/constants/curriculum-permissions.constants';
import { LESSON_CONTENT_READ_PERMISSION } from '../../learning-content/constants/learning-content-permissions.constants';
import {
  LearnerCurriculumTreeResponseDto,
  LearnerLessonContentResponseDto,
} from '../dto/learner-curriculum-delivery-response.dto';
import {
  parseRequestedLocale,
  toLearnerCurriculumTreeResponseDto,
  toLearnerLessonContentResponseDto,
} from '../mappers/curriculum-delivery-response.mapper';
import { CurriculumDeliveryService } from '../services/curriculum-delivery.service';
import { rethrowCurriculumDeliveryServiceError } from '../utils/curriculum-delivery-http.util';

@ApiTags('curriculum-delivery')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class CurriculumDeliveryController {
  constructor(private readonly curriculumDeliveryService: CurriculumDeliveryService) {}

  @Get('classes/:classId/curriculum-tree')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get published curriculum tree for a class (learner delivery)' })
  @ApiOkResponse({ type: LearnerCurriculumTreeResponseDto })
  @ApiForbiddenResponse({ description: 'Missing scope or permission' })
  @ApiNotFoundResponse({ description: 'Curriculum assignment not found for class triple' })
  async getClassCurriculumTree(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId') classId: string,
  ): Promise<LearnerCurriculumTreeResponseDto> {
    try {
      const tree = await this.curriculumDeliveryService.getClassCurriculumTree(
        authenticatedUser.userId,
        classId,
      );

      return toLearnerCurriculumTreeResponseDto(tree);
    } catch (error: unknown) {
      rethrowCurriculumDeliveryServiceError(error);
    }
  }

  @Get('enrollments/:enrollmentId/curriculum-tree')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get published curriculum tree for an enrollment (learner delivery)' })
  @ApiOkResponse({ type: LearnerCurriculumTreeResponseDto })
  async getEnrollmentCurriculumTree(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ): Promise<LearnerCurriculumTreeResponseDto> {
    try {
      const tree = await this.curriculumDeliveryService.getEnrollmentCurriculumTree(
        authenticatedUser.userId,
        enrollmentId,
      );

      return toLearnerCurriculumTreeResponseDto(tree);
    } catch (error: unknown) {
      rethrowCurriculumDeliveryServiceError(error);
    }
  }

  @Get('classes/:classId/lessons/:lessonId/content')
  @RequirePermissions(LESSON_CONTENT_READ_PERMISSION)
  @ApiOperation({ summary: 'Get published lesson content in class context (learner delivery)' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Parsed for future localization; source content returned at this phase',
  })
  @ApiOkResponse({ type: LearnerLessonContentResponseDto })
  async getClassLessonContent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId') classId: string,
    @Param('lessonId') lessonId: string,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<LearnerLessonContentResponseDto> {
    try {
      const content = await this.curriculumDeliveryService.getClassLessonContent(
        authenticatedUser.userId,
        classId,
        lessonId,
        parseRequestedLocale(acceptLanguage),
      );

      return toLearnerLessonContentResponseDto(content);
    } catch (error: unknown) {
      rethrowCurriculumDeliveryServiceError(error);
    }
  }

  @Get('enrollments/:enrollmentId/lessons/:lessonId/content')
  @RequirePermissions(LESSON_CONTENT_READ_PERMISSION)
  @ApiOperation({
    summary: 'Get published lesson content in enrollment context (learner delivery)',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Parsed for future localization; source content returned at this phase',
  })
  @ApiOkResponse({ type: LearnerLessonContentResponseDto })
  async getEnrollmentLessonContent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<LearnerLessonContentResponseDto> {
    try {
      const content = await this.curriculumDeliveryService.getEnrollmentLessonContent(
        authenticatedUser.userId,
        enrollmentId,
        lessonId,
        parseRequestedLocale(acceptLanguage),
      );

      return toLearnerLessonContentResponseDto(content);
    } catch (error: unknown) {
      rethrowCurriculumDeliveryServiceError(error);
    }
  }
}
