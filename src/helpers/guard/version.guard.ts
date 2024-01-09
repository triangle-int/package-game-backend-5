import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import _ from 'lodash';
import { GameConfigService } from '../../game-config/game-config.service';

@Injectable()
export class VersionGuard implements CanActivate {
  constructor(private config: GameConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      !_.includes(
        this.config.config.versions,
        context.switchToHttp().getRequest().header('version'),
      )
    )
      throw new ForbiddenException('incorrectVersion');

    return true;
  }
}
