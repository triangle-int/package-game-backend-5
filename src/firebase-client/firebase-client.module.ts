import { Module } from '@nestjs/common';
import { FirebaseClientService } from './firebase-client.service';
import { FirebaseClientController } from './firebase-client.controller';

@Module({
  providers: [FirebaseClientService],
  controllers: [FirebaseClientController],
})
export class FirebaseClientModule {}
