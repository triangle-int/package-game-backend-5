import { AppleEnvironment, IAPModule } from '@jeremybarbet/nest-iap';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  controllers: [PaymentController], // Simple Controller Import
  providers: [PaymentService], // Simple Service-Provider import
  imports: [
    // Global Configuration import
    ConfigModule.forRoot(),
    // Configuration IAPModule, startup payment settings.
    IAPModule.forRoot({
      // Apple Settings For Payment Verification
      apple: {
        password: process.env.APPLE_PASSWORD,
        environment: AppleEnvironment.SANDBOX,
      },
      // Google Settings For Payment Verification
      google: {
        clientEmail: process.env.ANDROID_CLIENT_EMAIL,
        privateKey: process.env.ANDROID_KEY,
      },
    }),
  ],
})
export class PaymentModule {}
