import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BuildingModule } from './building/building.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { GameConfigModule } from './game-config/game-config.module';
import { FirebaseModule } from 'nestjs-firebase';
import * as firebaseConfig from './serviceAccount.json';
import { FirebaseClientModule } from './firebase-client/firebase-client.module';
import { InventoryModule } from './inventory/inventory.module';
import { TradeModule } from './trade/trade.module';
import { TruckModule } from './truck/truck.module';
import { TaskModule } from './task/task.module';
import { FactoryModule } from './factory/factory.module';
import { MathModule } from './math/math.module';
import { MarketModule } from './market/market.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BusinessModule } from './business/business.module';
import { APP_GUARD } from '@nestjs/core';
import { VersionGuard } from './helpers/guard/version.guard';
import { NotificationsModule } from './notifications/notifications.module';
import { SatelliteModule } from './satellite/satellite.module';
import { DiscordModule } from './discord/discord.module';
import { SchedulesModule } from './schedules/schedules.module';
import { UpdatesModule } from './updates/updates.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AnticheatModule } from './anticheat/anticheat.module';
import { BoosterModule } from './booster/booster.module';
import { PaymentModule } from './payment/payment.module';

const firebase_params = {
  type: firebaseConfig.type,
  projectId: firebaseConfig.project_id,
  privateKeyId: firebaseConfig.private_key_id,
  privateKey: firebaseConfig.private_key,
  clientEmail: firebaseConfig.client_email,
  clientId: firebaseConfig.client_id,
  authUri: firebaseConfig.auth_uri,
  tokenUri: firebaseConfig.token_uri,
  authProviderX509CertUrl: firebaseConfig.auth_provider_x509_cert_url,
  clientC509CertUrl: firebaseConfig.client_x509_cert_url,
};

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 10,
      limit: 50,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    TaskModule,
    FirebaseClientModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
    }),
    GameConfigModule,
    FirebaseModule.forRoot({
      googleApplicationCredential: firebase_params,
    }),
    AuthModule,
    UserModule,
    BuildingModule,
    InventoryModule,
    TradeModule,
    TruckModule,
    FactoryModule,
    MathModule,
    MarketModule,
    BusinessModule,
    NotificationsModule,
    SatelliteModule,
    DiscordModule,
    SchedulesModule,
    UpdatesModule,
    AnticheatModule,
    BoosterModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: VersionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
