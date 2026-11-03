import { Module } from '@nestjs/common';
import { UpdatesModule } from '../updates/updates.module';
import { SoloMarketController } from './solo-market.controller';
import { SoloMarketService } from './solo-market.service';

@Module({
  imports: [UpdatesModule],
  controllers: [SoloMarketController],
  providers: [SoloMarketService],
})
export class SoloMarketModule {}
