import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Schedule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private scheduler: SchedulerRegistry,
    private events: EventEmitter2,
  ) {
    this.init();
  }

  private intervals: { [key: string]: any } = {};

  private async init() {
    const schedules = await this.prisma.schedule.findMany({
      where: { serverId: this.config.get('SERVER_ID') },
    });

    for (const schedule of schedules) {
      this.initSchedule(schedule);
    }
  }

  private async initSchedule(schedule: Schedule) {
    setTimeout(() => {
      this.handleInterval(schedule.id);

      const interval = setInterval(
        () => this.handleInterval(schedule.id),
        schedule.interval,
      );
      this.intervals[schedule.id] = interval;
    }, schedule.nextExecutionTime.getTime() - Date.now());
  }

  private async handleInterval(scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (schedule == null) return;

    const now = Date.now();
    const nextExecutionTime = new Date(now + schedule.interval);

    await this.prisma.schedule.update({
      where: { id: schedule.id },
      data: { nextExecutionTime },
    });

    this.events.emit(
      schedule.eventName,
      JSON.parse(schedule.params),
      schedule.id,
    );
  }

  async addSchedule(
    nextExecutionTime: Date,
    eventName: string,
    scheduleId: string,
    interval: number,
    params: any,
  ) {
    const schedule = await this.prisma.schedule.create({
      data: {
        id: scheduleId,
        serverId: this.config.get('SERVER_ID'),
        eventName,
        nextExecutionTime,
        interval,
        params: JSON.stringify(params),
      },
    });

    await this.initSchedule(schedule);
  }

  async removeSchedule(id: string) {
    const interval = this.intervals[id];
    clearInterval(interval);
    await this.prisma.schedule.delete({ where: { id } });
    delete this.intervals[id];
  }
}
