import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

export function getTestHttpServer(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}
