import { Global, Module } from '@nestjs/common';
import { GameConfigService } from './game-config.service';
import { GameConfigController } from './game-config.controller';

@Global()
@Module({
  providers: [GameConfigService],
  controllers: [GameConfigController],
  exports: [GameConfigService],
})
export class GameConfigModule {}
