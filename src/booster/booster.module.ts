import { Global, Module } from '@nestjs/common';
import { BoosterController } from './booster.controller';
import { BoosterService } from './booster.service';

@Global()
@Module({
  controllers: [BoosterController],
  providers: [BoosterService],
  exports: [BoosterService],
})
export class BoosterModule {}
