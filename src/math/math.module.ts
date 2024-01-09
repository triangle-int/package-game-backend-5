import { Global, Module } from '@nestjs/common';
import { MathService } from './math.service';

@Global()
@Module({
  providers: [MathService],
  exports: [MathService],
})
export class MathModule {}
