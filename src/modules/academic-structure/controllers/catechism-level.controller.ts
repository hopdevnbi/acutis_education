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
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CATECHISM_LEVEL_MANAGE_PERMISSION,
  CATECHISM_LEVEL_READ_PERMISSION,
} from '../constants/academic-structure-permissions.constants';
import { CatechismLevelListQueryDto } from '../dto/catechism-level-list-query.dto';
import { CatechismLevelListResponseDto } from '../dto/catechism-level-list-response.dto';
import { CatechismLevelResponseDto } from '../dto/catechism-level-response.dto';
import { CreateCatechismLevelRequestDto } from '../dto/create-catechism-level-request.dto';
import { UpdateCatechismLevelRequestDto } from '../dto/update-catechism-level-request.dto';
import { UpdateCatechismLevelStatusRequestDto } from '../dto/update-catechism-level-status-request.dto';
import {
  toCatechismLevelListResponseDto,
  toCatechismLevelResponseDto,
} from '../mappers/catechism-level-response.mapper';
import { CatechismLevelService } from '../services/catechism-level.service';
import { rethrowAcademicStructureServiceError } from '../utils/academic-structure-http.util';

@ApiTags('catechism-levels')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class CatechismLevelController {
  constructor(private readonly catechismLevelService: CatechismLevelService) {}

  @Post('parishes/:parishId/catechism-levels')
  @RequirePermissions(CATECHISM_LEVEL_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a catechism level for a parish' })
  @ApiCreatedResponse({ type: CatechismLevelResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing catechism-levels.manage permission' })
  async createCatechismLevel(
    @Param('parishId') parishId: string,
    @Body() request: CreateCatechismLevelRequestDto,
  ): Promise<CatechismLevelResponseDto> {
    try {
      const snapshot = await this.catechismLevelService.createCatechismLevel(parishId, {
        code: request.code,
        name: request.name,
        sortOrder: request.sortOrder,
      });

      return toCatechismLevelResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Get('parishes/:parishId/catechism-levels')
  @RequirePermissions(CATECHISM_LEVEL_READ_PERMISSION)
  @ApiOperation({ summary: 'List catechism levels for a parish' })
  @ApiOkResponse({ type: CatechismLevelListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing catechism-levels.read permission' })
  async listCatechismLevelsByParish(
    @Param('parishId') parishId: string,
    @Query() query: CatechismLevelListQueryDto,
  ): Promise<CatechismLevelListResponseDto> {
    try {
      const result = await this.catechismLevelService.listCatechismLevelsByParish(parishId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        search: query.search,
      });

      return toCatechismLevelListResponseDto(result);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Get('catechism-levels/:id')
  @RequirePermissions(CATECHISM_LEVEL_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a catechism level by id' })
  @ApiOkResponse({ type: CatechismLevelResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing catechism-levels.read permission' })
  async getCatechismLevelById(
    @Param('id') catechismLevelId: string,
  ): Promise<CatechismLevelResponseDto> {
    try {
      const snapshot = await this.catechismLevelService.getCatechismLevelById(catechismLevelId);

      return toCatechismLevelResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Patch('catechism-levels/:id')
  @RequirePermissions(CATECHISM_LEVEL_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update catechism level code, name, and/or sort order' })
  @ApiOkResponse({ type: CatechismLevelResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing catechism-levels.manage permission' })
  async updateCatechismLevel(
    @Param('id') catechismLevelId: string,
    @Body() request: UpdateCatechismLevelRequestDto,
  ): Promise<CatechismLevelResponseDto> {
    if (
      request.code === undefined &&
      request.name === undefined &&
      request.sortOrder === undefined
    ) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      const snapshot = await this.catechismLevelService.updateCatechismLevel(catechismLevelId, {
        code: request.code,
        name: request.name,
        sortOrder: request.sortOrder,
      });

      return toCatechismLevelResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Patch('catechism-levels/:id/status')
  @RequirePermissions(CATECHISM_LEVEL_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update catechism level status' })
  @ApiOkResponse({ type: CatechismLevelResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing catechism-levels.manage permission' })
  async updateCatechismLevelStatus(
    @Param('id') catechismLevelId: string,
    @Body() request: UpdateCatechismLevelStatusRequestDto,
  ): Promise<CatechismLevelResponseDto> {
    try {
      const snapshot = await this.catechismLevelService.updateCatechismLevelStatus(
        catechismLevelId,
        request.status,
      );

      return toCatechismLevelResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }
}
