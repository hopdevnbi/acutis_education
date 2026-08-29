import { Catch, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { readRequestIdFromRequest } from '../request-context/request-id.util';
import {
  REQUEST_ID_HEADER,
  type RequestWithContext,
} from '../request-context/request-context.types';
import type { ApiErrorResponse } from './api-error-response.types';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(GlobalExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request & RequestWithContext>();
    const requestId = readRequestIdFromRequest(request);

    response.setHeader(REQUEST_ID_HEADER, requestId);

    const errorResponse = this.buildErrorResponse(exception, request, requestId);

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        {
          requestId,
          path: request.url,
          method: request.method,
          statusCode: errorResponse.statusCode,
          err: exception instanceof Error ? exception : undefined,
        },
        'Unhandled exception',
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request & RequestWithContext,
    requestId: string,
  ): ApiErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        statusCode,
        error: this.resolveErrorName(statusCode),
        message: this.extractMessage(exceptionResponse),
        path,
        timestamp,
        requestId,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.',
      path,
      timestamp,
      requestId,
    };
  }

  private extractMessage(exceptionResponse: string | object): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const messageValue = exceptionResponse.message;

      if (typeof messageValue === 'string' || Array.isArray(messageValue)) {
        return messageValue;
      }
    }

    return 'Request failed.';
  }

  private resolveErrorName(statusCode: number): string {
    if (statusCode === 400) {
      return 'Bad Request';
    }

    if (statusCode === 401) {
      return 'Unauthorized';
    }

    if (statusCode === 403) {
      return 'Forbidden';
    }

    if (statusCode === 404) {
      return 'Not Found';
    }

    if (statusCode === 409) {
      return 'Conflict';
    }

    if (statusCode === 422) {
      return 'Unprocessable Entity';
    }

    return 'Error';
  }
}
