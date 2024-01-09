import { Module } from '@nestjs/common';
import { FirebaseClientService } from './firebase-client.service';

@Module({
  providers: [FirebaseClientService],
  exports: [FirebaseClientService],
})
export class FirebaseClientModule {}
