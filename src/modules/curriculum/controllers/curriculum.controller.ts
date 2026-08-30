import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
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
import { CreateCurriculumRequestDto } from '../dto/create-curriculum-request.dto';
import { CreateCurriculumVersionRequestDto } from '../dto/create-curriculum-version-request.dto';
import { CurriculumListQueryDto } from '../dto/curriculum-list-query.dto';
import { CurriculumListResponseDto } from '../dto/curriculum-list-response.dto';
import { CurriculumResponseDto } from '../dto/curriculum-response.dto';
import { CurriculumVersionListQueryDto } from '../dto/curriculum-version-list-query.dto';
import { CurriculumVersionListResponseDto } from '../dto/curriculum-version-list-response.dto';
import { CurriculumVersionResponseDto } from '../dto/curriculum-version-response.dto';
import { UpdateCurriculumRequestDto } from '../dto/update-curriculum-request.dto';
import { UpdateCurriculumStatusRequestDto } from '../dto/update-curriculum-status-request.dto';
import { UpdateCurriculumVersionRequestDto } from '../dto/update-curriculum-version-request.dto';
import { VersionTreeResponseDto } from '../dto/version-tree-response.dto';
import {
  toCurriculumListResponseDto,
  toCurriculumResponseDto,
  toCurriculumVersionListResponseDto,
  toCurriculumVersionResponseDto,
  toVersionTreeResponseDto,
} from '../mappers/curriculum-response.mapper';
import { CurriculumService } from '../services/curriculum.service';
import { rethrowCurriculumServiceError } from '../utils/curriculum-http.util';

@ApiTags('curricula')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class CurriculumController {
  constructor(
    private readonly curriculumService: CurriculumService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('parishes/:parishId/curricula')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a curriculum for a parish and catechism level' })
  @ApiCreatedResponse({ type: CurriculumResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing curricula.manage permission or parish scope' })
  async createCurriculum(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Body() request: CreateCurriculumRequestDto,
  ): Promise<CurriculumResponseDto> {
    try {
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.createCurriculum(parishId, {
        catechismLevelId: request.catechismLevelId,
        code: request.code,
        name: request.name,
        description: request.description,
        sourceLocale: request.sourceLocale,
      });

      return toCurriculumResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('parishes/:parishId/curricula')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'List curricula for a parish' })
  @ApiOkResponse({ type: CurriculumListResponseDto })
  async listCurriculaByParish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Query() query: CurriculumListQueryDto,
  ): Promise<CurriculumListResponseDto> {
    try {
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const result = await this.curriculumService.listCurriculaByParish(parishId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        catechismLevelId: query.catechismLevelId,
        status: query.status,
        sourceLocale: query.sourceLocale,
        search: query.search,
      });

      return toCurriculumListResponseDto(result);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('curricula/:id')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a curriculum by id' })
  @ApiOkResponse({ type: CurriculumResponseDto })
  async getCurriculumById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') curriculumId: string,
  ): Promise<CurriculumResponseDto> {
    try {
      const parishId = await this.curriculumService.getCurriculumParishId(curriculumId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.getCurriculumById(curriculumId);

      return toCurriculumResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Patch('curricula/:id')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update curriculum metadata' })
  @ApiOkResponse({ type: CurriculumResponseDto })
  async updateCurriculum(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') curriculumId: string,
    @Body() request: UpdateCurriculumRequestDto,
  ): Promise<CurriculumResponseDto> {
    if (
      request.code === undefined &&
      request.name === undefined &&
      request.description === undefined &&
      request.sourceLocale === undefined
    ) {
      throw new BadRequestException('At least one curriculum field must be provided for update.');
    }

    try {
      const parishId = await this.curriculumService.getCurriculumParishId(curriculumId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.updateCurriculum(curriculumId, {
        code: request.code,
        name: request.name,
        description: request.description,
        sourceLocale: request.sourceLocale,
      });

      return toCurriculumResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Patch('curricula/:id/status')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update curriculum lifecycle status' })
  @ApiOkResponse({ type: CurriculumResponseDto })
  async updateCurriculumStatus(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') curriculumId: string,
    @Body() request: UpdateCurriculumStatusRequestDto,
  ): Promise<CurriculumResponseDto> {
    try {
      const parishId = await this.curriculumService.getCurriculumParishId(curriculumId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.updateCurriculumStatus(
        curriculumId,
        request.status,
      );

      return toCurriculumResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Post('curricula/:id/versions')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft curriculum version' })
  @ApiCreatedResponse({ type: CurriculumVersionResponseDto })
  async createDraftVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') curriculumId: string,
    @Body() request: CreateCurriculumVersionRequestDto,
  ): Promise<CurriculumVersionResponseDto> {
    try {
      const parishId = await this.curriculumService.getCurriculumParishId(curriculumId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.createDraftVersion(curriculumId, {
        label: request.label,
        createdByUserId: authenticatedUser.userId,
      });

      return toCurriculumVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('curricula/:id/versions')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'List curriculum versions' })
  @ApiOkResponse({ type: CurriculumVersionListResponseDto })
  async listVersionsByCurriculum(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') curriculumId: string,
    @Query() query: CurriculumVersionListQueryDto,
  ): Promise<CurriculumVersionListResponseDto> {
    try {
      const parishId = await this.curriculumService.getCurriculumParishId(curriculumId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.curriculumService.listVersionsByCurriculum(curriculumId, {
        status: query.status,
      });

      return toCurriculumVersionListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('curriculum-versions/:id')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a curriculum version by id' })
  @ApiOkResponse({ type: CurriculumVersionResponseDto })
  async getVersionById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') versionId: string,
  ): Promise<CurriculumVersionResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.getVersionById(versionId);

      return toCurriculumVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Patch('curriculum-versions/:id')
  @RequirePermissions(CURRICULUM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update draft curriculum version label' })
  @ApiOkResponse({ type: CurriculumVersionResponseDto })
  async updateDraftVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') versionId: string,
    @Body() request: UpdateCurriculumVersionRequestDto,
  ): Promise<CurriculumVersionResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.updateDraftVersionLabel(versionId, {
        label: request.label,
      });

      return toCurriculumVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }

  @Get('curriculum-versions/:id/tree')
  @RequirePermissions(CURRICULUM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get curriculum version topic and lesson tree' })
  @ApiOkResponse({ type: VersionTreeResponseDto })
  async getVersionTree(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') versionId: string,
  ): Promise<VersionTreeResponseDto> {
    try {
      const parishId = await this.curriculumService.getVersionCurriculumParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.curriculumService.getVersionTree(versionId);

      return toVersionTreeResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowCurriculumServiceError(error);
    }
  }
}
