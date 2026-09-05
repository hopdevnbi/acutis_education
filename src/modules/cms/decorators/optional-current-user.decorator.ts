import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import type { RequestWithAuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

export const OptionalCurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | null => {
    const request = context.switchToHttp().getRequest<RequestWithAuthenticatedUser>();
    return request.authenticatedUser ?? null;
  },
);
