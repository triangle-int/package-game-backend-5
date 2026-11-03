import { Injectable } from '@nestjs/common';
import { Truck } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatesGateway } from './updates.gateway';

@Injectable()
export class UpdatesService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private gateway: UpdatesGateway,
  ) {}

  async sendUserUpdate(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user == null) return;

    const inventory = await this.inventory.getUserInventory(user);

    this.gateway.sendData('update', user.firebaseId, { ...user, inventory });
  }

  async sendBanUpdate(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ban: true },
    });

    this.gateway.sendData('banUpdate', user.firebaseId, user.ban);
  }

  isOnline(firebaseId: string) {
    return this.gateway.isOnline(firebaseId);
  }

  sendTruckCreation(truck: Truck) {
    this.gateway.sendBroadcast('truckCreated', truck);
  }

  sendTruckArrived(truck: Pick<Truck, 'id' | 'ownerId'>) {
    // Arrival only needs an ID; the caller also loaded the owner's private
    // account and notification details to process the delivery.
    this.gateway.sendBroadcast('truckArrived', {
      id: truck.id,
      ownerId: truck.ownerId,
    });
  }
}
