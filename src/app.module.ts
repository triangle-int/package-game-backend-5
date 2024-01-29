import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PingModule } from './ping/ping.module';
import { FirebaseModule } from 'nestjs-firebase';
import { AuthModule } from './auth/auth.module';
import { FirebaseClientModule } from './firebase-client/firebase-client.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    PingModule,
    FirebaseModule.forRoot({
      googleApplicationCredential: 'serviceAccount.json',
    }),
    AuthModule,
    FirebaseClientModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
