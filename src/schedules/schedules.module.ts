import { Module, Global } from '@nestjs/common';
import { SchedulesService } from './schedules.service';

@Global()
@Module({
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
