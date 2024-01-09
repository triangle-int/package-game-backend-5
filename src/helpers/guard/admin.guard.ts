import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      this.config.get('ADMIN_PASSWORD') !=
      context.switchToHttp().getRequest().header('adminPassword')
    )
      throw new ForbiddenException('notAdmin');

    return true;
  }
}
