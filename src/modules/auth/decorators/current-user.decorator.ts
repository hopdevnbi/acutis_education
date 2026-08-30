import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import type { RequestWithAuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { createInvalidCredentialsException } from '../utils/auth-http.util';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithAuthenticatedUser>();

    if (request.authenticatedUser === undefined) {
      throw createInvalidCredentialsException();
    }

    return request.authenticatedUser;
  },
);
