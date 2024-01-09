import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { FactoryModule } from '../factory/factory.module';
import { TradeModule } from '../trade/trade.module';
import { TruckController } from './truck.controller';
import { TruckService } from './truck.service';

@Module({
  controllers: [TruckController],
  providers: [TruckService],
  imports: [
    CacheModule.register(),
    HttpModule.register({}),
    FactoryModule,
    TradeModule,
  ],
})
export class TruckModule {}
