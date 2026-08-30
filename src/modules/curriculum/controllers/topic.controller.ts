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
} from '../constants/curriculum-permissions.constants';
import { CreateTopicRequestDto } from '../dto/create-topic-request.dto';
import { ReorderTopicsRequestDto } from '../dto/reorder-topics-request.dto';
import { TopicListResponseDto } from '../dto/topic-list-response.dto';
import { TopicResponseDto } from '../dto/topic-response.dto';
import { UpdateTopicRequestDto } from '../dto/update-topic-request.dto';
import { toTopicListResponseDto, toTopicResponseDto } from '../mappers/curriculum-response.mapper';
import { CurriculumService } from '../services/curriculum.service';
import { TopicService } from '../services/topic.service';
import { rethrowCurriculumServiceError } from '../utils/curriculum-http.util';

@ApiTags('curriculum-topics')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class TopicController {
  constructor(
    private readonly topicService: TopicService,
    private readonly curriculumService: CurriculumService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('curriculum-versions/:versionId/topics')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a topic in a draft curriculum version' })
  @ApiCreatedResponse({ type: TopicResponseDto })
  async createTopic(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: CreateTopicRequestDto,
  ): Promise<TopicResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.topicService.createTopic(versionId, {
        code: request.code,
        title: request.title,
        description: request.description,
        sortOrder: request.sortOrder,
      });

      return toTopicResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('curriculum-versions/:versionId/topics')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'List topics for a curriculum version' })
  @ApiOkResponse({ type: TopicListResponseDto })
  async listTopicsByVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<TopicListResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.topicService.listTopicsByVersion(versionId);

      return toTopicListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Patch('curriculum-versions/:versionId/topics/reorder')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Reorder topics within a draft curriculum version' })
  @ApiOkResponse({ type: TopicListResponseDto })
  async reorderTopics(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: ReorderTopicsRequestDto,
  ): Promise<TopicListResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshots = await this.topicService.reorderTopics(versionId, {
        topicIds: request.topicIds,
      });

      return toTopicListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('topics/:id')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a topic by id' })
  @ApiOkResponse({ type: TopicResponseDto })
  async getTopicById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') topicId: string,
  ): Promise<TopicResponseDto> {
    try {
      const parishId = await this.topicService.getTopicParishId(topicId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.topicService.getTopicById(topicId);

      return toTopicResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Patch('topics/:id')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update a topic in a draft curriculum version' })
  @ApiOkResponse({ type: TopicResponseDto })
  async updateTopic(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') topicId: string,
    @Body() request: UpdateTopicRequestDto,
  ): Promise<TopicResponseDto> {
    if (
      request.code === undefined &&
      request.title === undefined &&
      request.description === undefined
    ) {
      throw new BadRequestException('At least one topic field must be provided for update.');
    }

    try {
      const parishId = await this.topicService.getTopicParishId(topicId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.topicService.updateTopic(topicId, {
        code: request.code,
        title: request.title,
        description: request.description,
      });

      return toTopicResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Delete('topics/:id')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an empty topic from a draft curriculum version' })
  @ApiNoContentResponse({ description: 'Topic deleted' })
  async deleteTopic(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') topicId: string,
  ): Promise<void> {
    try {
      const parishId = await this.topicService.getTopicParishId(topicId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      await this.topicService.deleteTopic(topicId);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }
}
