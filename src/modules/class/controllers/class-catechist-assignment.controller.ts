import {
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CLASS_CATECHIST_MANAGE_PERMISSION,
  CLASS_CATECHIST_READ_PERMISSION,
} from '../constants/class-catechist-assignment.constants';
import { AssignCatechistRequestDto } from '../dto/assign-catechist-request.dto';
import { CatechistAssignmentListQueryDto } from '../dto/catechist-assignment-list-query.dto';
import { CatechistAssignmentListResponseDto } from '../dto/catechist-assignment-list-response.dto';
import { CatechistAssignmentResponseDto } from '../dto/catechist-assignment-response.dto';
import { UpdateCatechistAssignmentStatusRequestDto } from '../dto/update-catechist-assignment-status-request.dto';
import {
  toCatechistAssignmentListResponseDto,
  toCatechistAssignmentResponseDto,
} from '../mappers/class-catechist-assignment-response.mapper';
import { ClassCatechistAssignmentService } from '../services/class-catechist-assignment.service';
import { ClassScopeService } from '../services/class-scope.service';
import { rethrowClassCatechistAssignmentServiceError } from '../utils/class-catechist-assignment-http.util';

@ApiTags('class-catechists')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ClassCatechistAssignmentController {
  constructor(
    private readonly classCatechistAssignmentService: ClassCatechistAssignmentService,
    private readonly classScopeService: ClassScopeService,
  ) {}

  @Post('classes/:classId/catechists')
  @RequirePermissions(CLASS_CATECHIST_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a catechist to a class' })
  @ApiCreatedResponse({ type: CatechistAssignmentResponseDto })
  async assignCatechist(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId') classId: string,
    @Body() request: AssignCatechistRequestDto,
  ): Promise<CatechistAssignmentResponseDto> {
    try {
      await this.classScopeService.assertCanManageClass(authenticatedUser.userId, classId);

      const snapshot = await this.classCatechistAssignmentService.assignCatechist(classId, {
        catechistUserId: request.catechistUserId,
        assignmentRole: request.assignmentRole,
      });

      return toCatechistAssignmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowClassCatechistAssignmentServiceError(error);
    }
  }

  @Get('classes/:classId/catechists')
  @RequirePermissions(CLASS_CATECHIST_READ_PERMISSION)
  @ApiOperation({ summary: 'List catechist assignments for a class' })
  @ApiOkResponse({ type: CatechistAssignmentListResponseDto })
  async listAssignmentsByClass(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query() query: CatechistAssignmentListQueryDto,
  ): Promise<CatechistAssignmentListResponseDto> {
    try {
      await this.classScopeService.assertCanReadClass(authenticatedUser.userId, classId);

      const result = await this.classCatechistAssignmentService.listAssignmentsByClass(classId, {
        page: query.page,
        limit: query.limit,
        includeEnded: query.includeEnded,
      });

      return toCatechistAssignmentListResponseDto(result);
    } catch (error: unknown) {
      rethrowClassCatechistAssignmentServiceError(error);
    }
  }

  @Patch('class-catechist-assignments/:id/status')
  @RequirePermissions(CLASS_CATECHIST_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'End a catechist assignment' })
  @ApiOkResponse({ type: CatechistAssignmentResponseDto })
  async updateAssignmentStatus(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') assignmentId: string,
    @Body() request: UpdateCatechistAssignmentStatusRequestDto,
  ): Promise<CatechistAssignmentResponseDto> {
    try {
      const assignment = await this.classCatechistAssignmentService.getAssignmentById(assignmentId);

      await this.classScopeService.assertCanManageClass(
        authenticatedUser.userId,
        assignment.classId,
      );

      const snapshot = await this.classCatechistAssignmentService.updateAssignmentStatus(
        assignmentId,
        request.status,
      );

      return toCatechistAssignmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowClassCatechistAssignmentServiceError(error);
    }
  }
}
