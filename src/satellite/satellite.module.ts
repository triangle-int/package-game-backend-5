import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { SatelliteController } from './satellite.controller';
import { SatelliteService } from './satellite.service';

@Module({
  controllers: [SatelliteController],
  providers: [SatelliteService],
  imports: [BusinessModule],
})
export class SatelliteModule {}
