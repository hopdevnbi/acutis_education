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
  PARISH_MANAGE_PERMISSION,
  PARISH_READ_PERMISSION,
} from '../constants/parish-permissions.constants';
import { CreateParishRequestDto } from '../dto/create-parish-request.dto';
import { ParishListQueryDto } from '../dto/parish-list-query.dto';
import { ParishListResponseDto } from '../dto/parish-list-response.dto';
import { ParishResponseDto } from '../dto/parish-response.dto';
import { UpdateParishRequestDto } from '../dto/update-parish-request.dto';
import { UpdateParishStatusRequestDto } from '../dto/update-parish-status-request.dto';
import { toParishListResponseDto, toParishResponseDto } from '../mappers/parish-response.mapper';
import { ParishService } from '../services/parish.service';
import { rethrowParishServiceError } from '../utils/parish-http.util';

@ApiTags('parishes')
@Controller('parishes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ParishController {
  constructor(private readonly parishService: ParishService) {}

  @Post()
  @RequirePermissions(PARISH_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a parish' })
  @ApiCreatedResponse({ type: ParishResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing parishes.manage permission' })
  async createParish(@Body() request: CreateParishRequestDto): Promise<ParishResponseDto> {
    try {
      const snapshot = await this.parishService.createParish({
        code: request.code,
        name: request.name,
      });

      return toParishResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowParishServiceError(error);
    }
  }

  @Get()
  @RequirePermissions(PARISH_READ_PERMISSION)
  @ApiOperation({ summary: 'List parishes with pagination and optional filters' })
  @ApiOkResponse({ type: ParishListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing parishes.read permission' })
  async listParishes(@Query() query: ParishListQueryDto): Promise<ParishListResponseDto> {
    try {
      const result = await this.parishService.listParishes({
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        search: query.search,
      });

      return toParishListResponseDto(result);
    } catch (error: unknown) {
      rethrowParishServiceError(error);
    }
  }

  @Get(':id')
  @RequirePermissions(PARISH_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a parish by id' })
  @ApiOkResponse({ type: ParishResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing parishes.read permission' })
  async getParishById(@Param('id') parishId: string): Promise<ParishResponseDto> {
    try {
      const snapshot = await this.parishService.getParishById(parishId);

      return toParishResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowParishServiceError(error);
    }
  }

  @Patch(':id')
  @RequirePermissions(PARISH_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update parish code and/or name' })
  @ApiOkResponse({ type: ParishResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing parishes.manage permission' })
  async updateParish(
    @Param('id') parishId: string,
    @Body() request: UpdateParishRequestDto,
  ): Promise<ParishResponseDto> {
    if (
      request.code === undefined &&
      request.name === undefined &&
      request.defaultLocale === undefined
    ) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      const snapshot = await this.parishService.updateParish(parishId, {
        code: request.code,
        name: request.name,
        defaultLocale: request.defaultLocale,
      });

      return toParishResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowParishServiceError(error);
    }
  }

  @Patch(':id/status')
  @RequirePermissions(PARISH_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update parish status' })
  @ApiOkResponse({ type: ParishResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing parishes.manage permission' })
  async updateParishStatus(
    @Param('id') parishId: string,
    @Body() request: UpdateParishStatusRequestDto,
  ): Promise<ParishResponseDto> {
    try {
      const snapshot = await this.parishService.updateParishStatus(parishId, request.status);

      return toParishResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowParishServiceError(error);
    }
  }
}
