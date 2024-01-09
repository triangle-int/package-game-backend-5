import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GetUserPipe } from '../pipe/get-user.pipe';

export const GetFirebaseUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);

export const GetUser = () => GetFirebaseUser(GetUserPipe);
