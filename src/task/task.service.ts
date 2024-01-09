import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Timeout } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
    private config: ConfigService,
  ) {
    this.init();
  }

  private async init() {
    const timeouts = await this.prisma.timeout.findMany({
      where: { serverId: this.config.get('SERVER_ID') },
    });

    for (const timeout of timeouts) {
      this.initTimeout(timeout);
    }
  }

  private initTimeout(timeout: Timeout) {
    setTimeout(async () => {
      await this.prisma.timeout.delete({ where: { id: timeout.id } });
      this.events.emit(timeout.eventName, JSON.parse(timeout.params));
    }, timeout.executionTime.getTime() - Date.now());
  }

  async addTimeout(executionTime: Date, eventName: string, params: any) {
    const timeout = await this.prisma.timeout.create({
      data: {
        eventName,
        params: JSON.stringify(params),
        executionTime,
        serverId: this.config.get('SERVER_ID'),
      },
    });

    this.initTimeout(timeout);
  }
}
