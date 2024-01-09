import { Global, Module } from '@nestjs/common';
import { AnticheatService } from './anticheat.service';

@Global()
@Module({ providers: [AnticheatService], exports: [AnticheatService] })
export class AnticheatModule {}
