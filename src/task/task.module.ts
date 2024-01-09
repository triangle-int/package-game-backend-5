import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TaskService } from './task.service';

@Global()
@Module({
  providers: [TaskService],
  exports: [TaskService],
  imports: [EventEmitterModule.forRoot()],
})
export class TaskModule {}
