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
  CLASS_MANAGE_PERMISSION,
  CLASS_READ_PERMISSION,
} from '../constants/class-permissions.constants';
import { ClassListQueryDto } from '../dto/class-list-query.dto';
import { ClassListResponseDto } from '../dto/class-list-response.dto';
import { ClassResponseDto } from '../dto/class-response.dto';
import { CreateClassRequestDto } from '../dto/create-class-request.dto';
import { UpdateClassRequestDto } from '../dto/update-class-request.dto';
import { UpdateClassStatusRequestDto } from '../dto/update-class-status-request.dto';
import { toClassListResponseDto, toClassResponseDto } from '../mappers/class-response.mapper';
import { ClassService } from '../services/class.service';
import { rethrowClassServiceError } from '../utils/class-http.util';

@ApiTags('classes')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post('parishes/:parishId/classes')
  @RequirePermissions(CLASS_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a class for a parish' })
  @ApiCreatedResponse({ type: ClassResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing classes.manage permission' })
  async createClass(
    @Param('parishId') parishId: string,
    @Body() request: CreateClassRequestDto,
  ): Promise<ClassResponseDto> {
    try {
      const snapshot = await this.classService.createClass(parishId, {
        academicYearId: request.academicYearId,
        catechismLevelId: request.catechismLevelId,
        code: request.code,
        name: request.name,
      });

      return toClassResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowClassServiceError(error);
    }
  }

  @Get('parishes/:parishId/classes')
  @RequirePermissions(CLASS_READ_PERMISSION)
  @ApiOperation({ summary: 'List classes for a parish' })
  @ApiOkResponse({ type: ClassListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing classes.read permission' })
  async listClassesByParish(
    @Param('parishId') parishId: string,
    @Query() query: ClassListQueryDto,
  ): Promise<ClassListResponseDto> {
    try {
      const result = await this.classService.listClassesByParish(parishId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        academicYearId: query.academicYearId,
        catechismLevelId: query.catechismLevelId,
        status: query.status,
        search: query.search,
      });

      return toClassListResponseDto(result);
    } catch (error: unknown) {
      rethrowClassServiceError(error);
    }
  }

  @Get('classes/:id')
  @RequirePermissions(CLASS_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a class by id' })
  @ApiOkResponse({ type: ClassResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing classes.read permission' })
  async getClassById(@Param('id') classId: string): Promise<ClassResponseDto> {
    try {
      const snapshot = await this.classService.getClassById(classId);

      return toClassResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowClassServiceError(error);
    }
  }

  @Patch('classes/:id')
  @RequirePermissions(CLASS_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update class code and/or name' })
  @ApiOkResponse({ type: ClassResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing classes.manage permission' })
  async updateClass(
    @Param('id') classId: string,
    @Body() request: UpdateClassRequestDto,
  ): Promise<ClassResponseDto> {
    if (request.code === undefined && request.name === undefined) {
      throw new BadRequestException('At least one class field must be provided for update.');
    }

    try {
      const snapshot = await this.classService.updateClass(classId, {
        code: request.code,
        name: request.name,
      });

      return toClassResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowClassServiceError(error);
    }
  }

  @Patch('classes/:id/status')
  @RequirePermissions(CLASS_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update class lifecycle status' })
  @ApiOkResponse({ type: ClassResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing classes.manage permission' })
  async updateClassStatus(
    @Param('id') classId: string,
    @Body() request: UpdateClassStatusRequestDto,
  ): Promise<ClassResponseDto> {
    try {
      const snapshot = await this.classService.updateClassStatus(classId, request.status);

      return toClassResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowClassServiceError(error);
    }
  }
}
