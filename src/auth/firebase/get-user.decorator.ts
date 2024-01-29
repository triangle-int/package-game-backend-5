import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { FirebasePipe } from './firebase.pipe';

const GetUserDecorator = createParamDecorator(
  (_, context: ExecutionContext) => {
    return context.switchToHttp().getRequest().user;
  },
);

export const GetUser = () => GetUserDecorator(FirebasePipe);
