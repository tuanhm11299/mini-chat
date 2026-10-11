import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** What JwtAuthGuard attaches to the request after verifying the access token. */
export interface AuthUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/** Injects the signed-in user, e.g. `list(@CurrentUser() user: AuthUser)`. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
