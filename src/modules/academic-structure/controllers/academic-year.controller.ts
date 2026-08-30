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
  ACADEMIC_YEAR_MANAGE_PERMISSION,
  ACADEMIC_YEAR_READ_PERMISSION,
} from '../constants/academic-structure-permissions.constants';
import { AcademicYearListQueryDto } from '../dto/academic-year-list-query.dto';
import { AcademicYearListResponseDto } from '../dto/academic-year-list-response.dto';
import { AcademicYearResponseDto } from '../dto/academic-year-response.dto';
import { CreateAcademicYearRequestDto } from '../dto/create-academic-year-request.dto';
import { UpdateAcademicYearRequestDto } from '../dto/update-academic-year-request.dto';
import { UpdateAcademicYearStatusRequestDto } from '../dto/update-academic-year-status-request.dto';
import {
  toAcademicYearListResponseDto,
  toAcademicYearResponseDto,
} from '../mappers/academic-year-response.mapper';
import { AcademicYearService } from '../services/academic-year.service';
import { rethrowAcademicStructureServiceError } from '../utils/academic-structure-http.util';

@ApiTags('academic-years')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  @Post('parishes/:parishId/academic-years')
  @RequirePermissions(ACADEMIC_YEAR_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an academic year for a parish' })
  @ApiCreatedResponse({ type: AcademicYearResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing academic-years.manage permission' })
  async createAcademicYear(
    @Param('parishId') parishId: string,
    @Body() request: CreateAcademicYearRequestDto,
  ): Promise<AcademicYearResponseDto> {
    try {
      const snapshot = await this.academicYearService.createAcademicYear(parishId, {
        name: request.name,
        startDate: request.startDate,
        endDate: request.endDate,
      });

      return toAcademicYearResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Get('parishes/:parishId/academic-years')
  @RequirePermissions(ACADEMIC_YEAR_READ_PERMISSION)
  @ApiOperation({ summary: 'List academic years for a parish' })
  @ApiOkResponse({ type: AcademicYearListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing academic-years.read permission' })
  async listAcademicYearsByParish(
    @Param('parishId') parishId: string,
    @Query() query: AcademicYearListQueryDto,
  ): Promise<AcademicYearListResponseDto> {
    try {
      const result = await this.academicYearService.listAcademicYearsByParish(parishId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        search: query.search,
      });

      return toAcademicYearListResponseDto(result);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Get('academic-years/:id')
  @RequirePermissions(ACADEMIC_YEAR_READ_PERMISSION)
  @ApiOperation({ summary: 'Get an academic year by id' })
  @ApiOkResponse({ type: AcademicYearResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing academic-years.read permission' })
  async getAcademicYearById(@Param('id') academicYearId: string): Promise<AcademicYearResponseDto> {
    try {
      const snapshot = await this.academicYearService.getAcademicYearById(academicYearId);

      return toAcademicYearResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Patch('academic-years/:id')
  @RequirePermissions(ACADEMIC_YEAR_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update academic year name and/or dates' })
  @ApiOkResponse({ type: AcademicYearResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing academic-years.manage permission' })
  async updateAcademicYear(
    @Param('id') academicYearId: string,
    @Body() request: UpdateAcademicYearRequestDto,
  ): Promise<AcademicYearResponseDto> {
    if (
      request.name === undefined &&
      request.startDate === undefined &&
      request.endDate === undefined
    ) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      const snapshot = await this.academicYearService.updateAcademicYear(academicYearId, {
        name: request.name,
        startDate: request.startDate,
        endDate: request.endDate,
      });

      return toAcademicYearResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }

  @Patch('academic-years/:id/status')
  @RequirePermissions(ACADEMIC_YEAR_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update academic year status' })
  @ApiOkResponse({ type: AcademicYearResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing academic-years.manage permission' })
  async updateAcademicYearStatus(
    @Param('id') academicYearId: string,
    @Body() request: UpdateAcademicYearStatusRequestDto,
  ): Promise<AcademicYearResponseDto> {
    try {
      const snapshot = await this.academicYearService.updateAcademicYearStatus(
        academicYearId,
        request.status,
      );

      return toAcademicYearResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowAcademicStructureServiceError(error);
    }
  }
}
