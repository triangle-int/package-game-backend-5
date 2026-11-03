import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatesService } from '../updates/updates.service';
import { SoloMarketDto } from './dto/solo-market.dto';

@Injectable()
export class SoloMarketService {
  private readonly buyMultiplier = 2;
  private readonly sellMultiplier = 0.7;
  private readonly logger = new Logger(SoloMarketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: GameConfigService,
    private readonly updates: UpdatesService,
  ) {}

  private resource(name: string) {
    const item = this.config.config.items.find(
      (candidate) => candidate.name === name && candidate.type === 'resource',
    );
    if (!item) throw new BadRequestException('resourceNotFound');
    return item;
  }

  private basePrice(item: { group?: number; level?: number }) {
    return 100 + (item.group ?? 0) * (item.level ?? 0) * 25;
  }

  catalog() {
    return this.config.config.items
      .filter((item) => item.type === 'resource')
      .map((item) => ({
        name: item.name,
        group: item.group,
        level: item.level,
        buyPrice: Math.ceil(this.basePrice(item) * this.buyMultiplier),
        sellPrice: Math.max(
          1,
          Math.floor(this.basePrice(item) * this.sellMultiplier),
        ),
      }));
  }

  async buy(dto: SoloMarketDto, user: User) {
    const item = this.resource(dto.resource);
    const price = BigInt(Math.ceil(this.basePrice(item) * this.buyMultiplier));
    const cost = price * BigInt(dto.count);
    const count = BigInt(dto.count);

    const money = await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, user.id);

      const storage = await tx.building.findFirst({
        where: { ownerId: user.id, discriminator: 'storage' },
        orderBy: { id: 'asc' },
        select: { id: true },
      });
      if (!storage) throw new BadRequestException('storageNotFound');

      const debited = await tx.user.updateMany({
        where: { id: user.id, money: { gte: cost } },
        data: { money: { decrement: cost } },
      });
      if (debited.count !== 1) throw new BadRequestException('notEnoughMoney');

      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          buildingId: storage.id,
          userId: null,
          name: dto.resource,
        },
        orderBy: { id: 'asc' },
        select: { id: true },
      });
      if (inventoryItem) {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { count: { increment: count } },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            name: dto.resource,
            count,
            buildingId: storage.id,
          },
        });
      }

      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: { money: true },
      });
      if (!current) throw new BadRequestException('userNotFound');
      return current.money;
    });

    this.sendUserUpdate(user.id);
    return { money, unitPrice: price };
  }

  async sell(dto: SoloMarketDto, user: User) {
    const item = this.resource(dto.resource);
    const price = BigInt(
      Math.max(1, Math.floor(this.basePrice(item) * this.sellMultiplier)),
    );
    const count = BigInt(dto.count);
    const revenue = price * count;

    const money = await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, user.id);

      const storages = await tx.building.findMany({
        where: { ownerId: user.id, discriminator: 'storage' },
        orderBy: { id: 'asc' },
        select: { id: true },
      });
      const inventory = await tx.inventoryItem.findMany({
        where: {
          buildingId: { in: storages.map(({ id }) => id) },
          userId: null,
          name: dto.resource,
          count: { gt: 0 },
        },
        orderBy: { id: 'asc' },
        select: { id: true, count: true },
      });
      const available = inventory.reduce(
        (total, inventoryItem) => total + inventoryItem.count,
        BigInt(0),
      );
      if (available < count)
        throw new BadRequestException('notEnoughResources');

      let remaining = count;
      for (const inventoryItem of inventory) {
        if (remaining === BigInt(0)) break;
        const removed =
          inventoryItem.count < remaining ? inventoryItem.count : remaining;
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { count: { decrement: removed } },
        });
        remaining -= removed;
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data: { money: { increment: revenue } },
        select: { money: true },
      });
      return updated.money;
    });

    this.sendUserUpdate(user.id);
    return { money, unitPrice: price };
  }

  private async lockUser(tx: Prisma.TransactionClient, userId: number) {
    const rows = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE
    `;
    if (rows.length !== 1) throw new BadRequestException('userNotFound');
  }

  private sendUserUpdate(userId: number) {
    void this.updates.sendUserUpdate(userId).catch((error) => {
      this.logger.warn(`Unable to send solo market update: ${error}`);
    });
  }
}
