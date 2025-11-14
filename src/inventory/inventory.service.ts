import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { MathService } from '../math/math.service';
import { GameConfigService } from '../game-config/game-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoosterService } from '../booster/booster.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private config: GameConfigService,
    private math: MathService,
    private boosters: BoosterService,
  ) {}

  async getUserInventory(user: User) {
    const storages = await this.prisma.building.findMany({
      where: { ownerId: user.id, discriminator: 'storage' },
      include: { inventory: true },
    });
    const inventory: { [key: number]: { name: string; count: bigint }[] } = {};

    for (const storage of storages) {
      inventory[storage.level] = storage.inventory.map(({ name, count }) => {
        return { name, count };
      });
    }

    return inventory;
  }

  async getInventory(userId: number) {
    const storages = await this.prisma.building.findMany({
      where: { ownerId: userId, discriminator: 'storage' },
      include: { inventory: true },
    });
    const inventory: { [key: string]: bigint } = {};

    for (const storage of storages) {
      for (const item of storage.inventory) {
        if (inventory[item.name] == null) inventory[item.name] = BigInt(0);
        inventory[item.name] += item.count;
      }
    }

    return inventory;
  }

  async addToInventory(
    resource: string,
    count: bigint,
    buildingId: number = null,
    ownerId: number = null,
  ) {
    const building =
      buildingId == null
        ? null
        : await this.prisma.building.findUnique({
            where: { id: buildingId },
          });

    const doLimit = building != null && building.discriminator === 'factory';
    const limit = await this.boosters.getBoostedFactoryProduction(
      building?.ownerId,
      this.config.config.factoryResourcesLimit,
    );

    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { buildingId: buildingId, name: resource, userId: ownerId },
    });

    if (inventoryItem == null) {
      await this.prisma.inventoryItem.create({
        data: {
          name: resource,
          count: doLimit ? this.math.min(count, BigInt(limit)) : count,
          buildingId: buildingId,
          userId: ownerId,
        },
      });
    } else {
      await this.prisma.inventoryItem.update({
        where: {
          id: inventoryItem.id,
        },
        data: {
          count: doLimit
            ? this.math.min(
                count + inventoryItem.count,
                this.math.max(BigInt(limit), inventoryItem.count),
              )
            : count + inventoryItem.count,
        },
      });
    }
  }

  async subtractFromInventory(
    resource: string,
    count: bigint,
    buildingId: number = null,
    ownerId: number = null,
  ): Promise<boolean> {
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { buildingId: buildingId, name: resource, userId: ownerId },
    });

    if (inventoryItem == null || inventoryItem.count < count) return false;

    await this.prisma.inventoryItem.update({
      where: {
        id: inventoryItem.id,
      },
      data: {
        count: inventoryItem.count - count,
      },
    });

    return true;
  }

  async subtractFromUserStorages(
    userId: number,
    resource: string,
    count: bigint,
  ): Promise<boolean> {
    const avialable = (await this.getInventory(userId))[resource] ?? 0;
    const storages = await this.prisma.building.findMany({
      where: { ownerId: userId, discriminator: 'storage' },
      include: { inventory: true },
    });

    if (count > avialable) return false;
    let remaining = count;

    for (const storage of storages) {
      const itemOfStorage = storage.inventory.find((i) => i.name === resource);

      if (itemOfStorage == null) continue;

      const substracted = this.math.min(itemOfStorage.count, remaining);
      if (substracted <= 0) continue;

      await this.subtractFromInventory(resource, substracted, storage.id);
      remaining -= substracted;
      if (remaining <= 0) break;
    }

    return true;
  }
}
