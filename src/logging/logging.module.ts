import { Module } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigService } from '../config/app-config.service';
import { resolveRequestId } from '../request-context/request-id.util';
import { REQUEST_ID_HEADER } from '../request-context/request-context.types';

const SENSITIVE_LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.set-cookie',
  'req.body.password',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'res.headers.authorization',
  'res.headers.cookie',
  'res.headers.set-cookie',
] as const;

type RequestWithContext = IncomingMessage & {
  requestId?: string;
};

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) => {
        const nodeEnv = appConfigService.getNodeEnv();
        const isDevelopment = nodeEnv === 'development';

        return {
          pinoHttp: {
            level: isDevelopment ? 'debug' : 'info',
            redact: [...SENSITIVE_LOG_REDACT_PATHS],
            autoLogging: {
              ignore: (request: IncomingMessage) => request.url === '/api/v1/health',
            },
            genReqId: (request: IncomingMessage, response: ServerResponse) => {
              const requestWithContext = request as RequestWithContext;

              if (typeof requestWithContext.requestId === 'string') {
                response.setHeader(REQUEST_ID_HEADER, requestWithContext.requestId);
                return requestWithContext.requestId;
              }

              const incomingHeader = request.headers[REQUEST_ID_HEADER];
              const incomingRequestId =
                typeof incomingHeader === 'string' ? incomingHeader : undefined;
              const requestId = resolveRequestId(incomingRequestId);

              requestWithContext.requestId = requestId;
              response.setHeader(REQUEST_ID_HEADER, requestId);

              return requestId;
            },
            customProps: (request: IncomingMessage) => ({
              requestId: readRequestIdProperty(request),
            }),
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                  },
                }
              : undefined,
          },
        };
      },
    }),
  ],
})
export class ApplicationLoggingModule {}

function readRequestIdProperty(request: RequestWithContext): string {
  if (typeof request.requestId === 'string') {
    return request.requestId;
  }

  if (typeof request.id === 'string') {
    return request.id;
  }

  if (typeof request.id === 'number') {
    return String(request.id);
  }

  return 'unknown';
}
