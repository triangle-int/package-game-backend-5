import { Injectable } from '@nestjs/common';
import gameConfig from './game-config.json';

@Injectable()
export class GameConfigService {
  get config() {
    return gameConfig;
  }
}
