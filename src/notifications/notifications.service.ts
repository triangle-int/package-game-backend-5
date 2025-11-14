import { Injectable } from '@nestjs/common';
import { Messaging } from 'firebase-admin/lib/messaging/messaging';
import { Truck, User } from 'prisma/app/generated/prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import { bigintToString } from '../helpers/interceptor/big-int.interceptor';

@Injectable()
export class NotificationsService {
  private messaging: Messaging;

  constructor(
    @InjectFirebaseAdmin() firebaseAdmin: FirebaseAdmin,
    private gameConfig: GameConfigService,
  ) {
    this.messaging = firebaseAdmin.messaging;
  }

  private async sendNotification(token: string, title: string, body: string) {
    if (token == null) return;

    try {
      await this.messaging.send({
        notification: { title, body },
        token,
      });
    } catch {}
  }

  async sendTradeBought(
    seller: User,
    buyer: User,
    name: string,
    count: number,
  ) {
    const item = this.gameConfig.config.items.find(
      (item) => item.name === name,
    );

    await this.sendNotification(
      seller.fcmToken,
      '💵 New Sale!',
      `${buyer.nickname} bought ${count} ${item.emoji} from you.`,
    );
  }

  async sendTruckArrived(truck: Truck, owner: User) {
    const item = this.gameConfig.config.items.find(
      (item) => item.name === truck.resource,
    );

    const emoji = ['🦮', '🚚', '🛩'][truck.truckType];
    const name = ['doggy', 'truck', 'plane'][truck.truckType];

    await this.sendNotification(
      owner.fcmToken,
      `${emoji} The ${name} has arrived`,
      `The ${name} with ${truck.resourceCount} ${item.emoji} in place`,
    );
  }

  async sendFactoryFee(owner: User, money: number) {
    await this.sendNotification(
      owner.fcmToken,
      '⏱ 24 hours payment',
      `You have been charged ${money} 💵`,
    );
  }

  async sendFactoryShutDown(owner: User) {
    await this.sendNotification(
      owner.fcmToken,
      '🛑 Your factory has been shut down',
      'Because you were unable to pay for the production',
    );
  }

  async sendLevelUp(user: User) {
    await this.sendNotification(
      user.fcmToken,
      'Congratulations 🎉',
      `You raised your level to ${user.level + 1}`,
    );
  }

  async sendTruckCreation(truck: Truck) {
    try {
      await this.messaging.send({
        data: { truck: JSON.stringify(bigintToString(truck)) },
        topic: 'trucks',
      });
    } catch {}
  }
}
