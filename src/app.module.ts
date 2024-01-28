import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PingModule } from './ping/ping.module';

@Module({
  imports: [PrismaModule, PingModule],
})
export class AppModule {}
