import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { UserService } from '../user/user.service';
import { GameConfigService } from '../game-config/game-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { BuyTradeDto, GetTradesDto, SetTradePriceDto } from './dto';
import { UpdatesService } from '../updates/updates.service';

@Injectable()
export class TradeService {
  constructor(
    private prisma: PrismaService,
    private config: GameConfigService,
    private inventoryService: InventoryService,
    private userService: UserService,
    private notifications: NotificationsService,
    private updates: UpdatesService,
  ) {}

  async getTrades(dto: GetTradesDto) {
    return await this.prisma.trade.findMany({
      where: {
        ...(dto.resources.length > 0 && { name: { in: dto.resources } }),
        ...(dto.nickname.length > 0 && { owner: { nickname: dto.nickname } }),
        pricePerUnit: { gt: 0 },
        count: { gt: 0 },
      },
      include: {
        owner: true,
      },
      skip: dto.page * this.config.config.tradesPerPage,
      take: this.config.config.tradesPerPage,
    });
  }

  async getUserTrades(user: User) {
    const trades = await this.prisma.trade.findMany({
      where: { ownerId: user.id },
    });

    for (const trade of trades) {
      const { _avg, _min } = await this.prisma.trade.aggregate({
        _avg: { pricePerUnit: true },
        _min: { pricePerUnit: true },
        where: { name: trade.name, pricePerUnit: { gt: 0 }, count: { gt: 0 } },
      });

      trade['min'] = _min || 0;
      trade['average'] = _avg || 0;
    }

    return trades;
  }

  async updateTradePrice(dto: SetTradePriceDto, user: User) {
    return await this.prisma.trade.updateMany({
      where: { id: dto.tradeId, ownerId: user.id },
      data: { pricePerUnit: dto.price },
    });
  }

  async buyTrade(dto: BuyTradeDto, user: User) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: dto.tradeId },
      include: { owner: true },
    });

    if (trade == null) throw new ForbiddenException('tradeNotFound');

    const cost = BigInt(dto.resourcesCount * trade.pricePerUnit);

    if (user.money < cost) throw new ForbiddenException('notEnoughMoney');

    const result = await this.removeFromTrade(
      trade.id,
      BigInt(dto.resourcesCount),
    );

    if (!result) throw new ForbiddenException('notEnoughResources');

    const item = this.config.config.items.find(
      (item) => item.name === trade.name,
    );

    await Promise.all([
      this.inventoryService.addToInventory(
        trade.name,
        BigInt(dto.resourcesCount),
        null,
        user.id,
      ),
      this.prisma.user.update({
        where: { id: user.id },
        data: { money: user.money - cost },
      }),
      this.prisma.user.update({
        where: { id: trade.owner.id },
        data: { money: trade.owner.money + cost },
      }),
      this.userService.addExpirience(
        user,
        item.level * this.config.config.expForTrade,
      ),
    ]);

    this.updates.sendUserUpdate(trade.owner.id);
    this.updates.sendUserUpdate(user.id);
    this.notifications.sendTradeBought(
      trade.owner,
      user,
      trade.name,
      dto.resourcesCount,
    );
  }

  async addToTrade(resource: string, resourceCount: bigint, ownerId: number) {
    const trade = await this.prisma.trade.findFirst({
      where: { ownerId: ownerId, name: resource },
    });

    if (trade == null) {
      await this.prisma.trade.create({
        data: {
          name: resource,
          count: resourceCount,
          ownerId: ownerId,
          pricePerUnit: 0,
        },
      });
    } else {
      await this.prisma.trade.update({
        data: {
          count: trade.count + resourceCount,
        },
        where: {
          id: trade.id,
        },
      });
    }
  }

  async removeFromTrade(tradeId: number, resourceCount: bigint) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (trade == null || trade.count < resourceCount) return false;

    await this.prisma.trade.update({
      where: { id: trade.id },
      data: { count: trade.count - resourceCount },
    });

    return true;
  }
}
