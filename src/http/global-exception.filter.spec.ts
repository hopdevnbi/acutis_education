import { ArgumentsHost, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { RequestWithContext } from '../request-context/request-context.types';
import type { ApiErrorResponse } from './api-error-response.types';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const filter = new GlobalExceptionFilter(logger as never);

  function createArgumentsHost(
    request: Partial<Request & RequestWithContext>,
    response: Partial<Response>,
  ): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getRequest: () => request as Request & RequestWithContext,
        getResponse: () => response as Response,
      }),
    } as ArgumentsHost;
  }

  it('returns a safe API error contract for HTTP exceptions', () => {
    const json = jest.fn<void, [ApiErrorResponse]>();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();

    filter.catch(
      new NotFoundException('Route not found'),
      createArgumentsHost(
        {
          url: '/api/v1/missing',
          method: 'GET',
          headers: {},
          requestId: '550e8400-e29b-41d4-a716-446655440000',
        },
        {
          status,
          setHeader,
        },
      ),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', '550e8400-e29b-41d4-a716-446655440000');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Route not found',
        path: '/api/v1/missing',
        requestId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    );

    const responseBody = json.mock.calls[0]?.[0];

    expect(responseBody).toBeDefined();
    expect(typeof responseBody?.timestamp).toBe('string');
    expect(responseBody).not.toHaveProperty('stack');
  });

  it('masks unexpected exceptions and logs them without returning stack traces', () => {
    const json = jest.fn<void, [ApiErrorResponse]>();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();

    filter.catch(
      new Error('database exploded'),
      createArgumentsHost(
        {
          url: '/api/v1/health',
          method: 'GET',
          headers: {},
          requestId: '660e8400-e29b-41d4-a716-446655440001',
        },
        {
          status,
          setHeader,
        },
      ),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(logger.error).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.',
        requestId: '660e8400-e29b-41d4-a716-446655440001',
      }),
    );

    const responseBody = json.mock.calls[0]?.[0];

    expect(responseBody).toBeDefined();
    expect(responseBody).not.toHaveProperty('stack');
  });

  it('masks server-side HttpException messages for 5xx responses', () => {
    const json = jest.fn<void, [ApiErrorResponse]>();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();

    filter.catch(
      new HttpException('DB timeout to mssql:1433', HttpStatus.INTERNAL_SERVER_ERROR),
      createArgumentsHost(
        {
          url: '/api/v1/example?token=secret',
          method: 'GET',
          headers: {},
          requestId: '880e8400-e29b-41d4-a716-446655440003',
        },
        {
          status,
          setHeader,
        },
      ),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/v1/example',
      }),
      'Unhandled exception',
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred.',
        path: '/api/v1/example',
      }),
    );
  });

  it('preserves validation-style messages from HttpException payloads', () => {
    const json = jest.fn<void, [ApiErrorResponse]>();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();

    filter.catch(
      new HttpException(
        {
          message: ['name must be a string'],
          error: 'Bad Request',
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      ),
      createArgumentsHost(
        {
          url: '/api/v1/example',
          method: 'POST',
          headers: {},
          requestId: '770e8400-e29b-41d4-a716-446655440002',
        },
        {
          status,
          setHeader,
        },
      ),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['name must be a string'],
      }),
    );
  });
});
