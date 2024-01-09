import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { FirebaseClientModule } from '../firebase-client/firebase-client.module';

@Global()
@Module({
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
  imports: [FirebaseClientModule],
})
export class UserModule {}
