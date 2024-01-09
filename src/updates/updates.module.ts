import { Module, Global } from '@nestjs/common';
import { UpdatesGateway } from './updates.gateway';
import { UpdatesService } from './updates.service';

@Global()
@Module({
  providers: [UpdatesGateway, UpdatesService],
  exports: [UpdatesService],
})
export class UpdatesModule {}
