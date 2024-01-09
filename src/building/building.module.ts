import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module';
import { IsResource } from '../validator/resource.validator';
import { BuildingController } from './building.controller';
import { BuildingService } from './building.service';

@Module({
  providers: [BuildingService, IsResource],
  controllers: [BuildingController],
  imports: [MarketModule],
})
export class BuildingModule {}
