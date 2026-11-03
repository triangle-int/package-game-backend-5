import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { TradeService } from './trade.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('../user/user.service', () => ({ UserService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../updates/updates.service', () => ({ UpdatesService: class {} }));

const buyer = { id: 7, money: BigInt(100) } as User;
const seller = { id: 8, money: BigInt(50) } as User;

function setup() {
  const trade = {
    id: 3,
    name: 'wheel',
    count: BigInt(5),
    pricePerUnit: 10,
    ownerId: 8,
    owner: seller,
  };
  const prisma = {
    trade: {
      findUnique: jest.fn().mockResolvedValue(trade),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({
        _avg: { pricePerUnit: 10 },
        _min: { pricePerUnit: 8 },
      }),
      update: jest.fn(async ({ data }) => ({ ...trade, ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(async ({ data }) => ({ id: 3, ...data })),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
  };
  const config = {
    config: {
      tradesPerPage: 20,
      expForTrade: 3,
      items: [{ name: 'wheel', level: 2 }],
    },
  };
  const inventory = { addToInventory: jest.fn().mockResolvedValue(undefined) };
  const userService = { addExpirience: jest.fn().mockResolvedValue({}) };
  const notifications = { sendTradeBought: jest.fn() };
  const updates = { sendUserUpdate: jest.fn() };
  const service = new TradeService(
    prisma as any,
    config as any,
    inventory as any,
    userService as any,
    notifications as any,
    updates as any,
  );
  return { service, trade, prisma, inventory, userService, notifications, updates };
}

describe('TradeService sale and purchase rules', () => {
  it('shows the owner current minimum and average listing prices', async () => {
    const { service, prisma, trade } = setup();
    prisma.trade.findMany.mockResolvedValue([{ ...trade }]);
    const listings = await service.getUserTrades(seller);
    expect(listings).toEqual([
      {
        ...trade,
        min: { pricePerUnit: 8 },
        average: { pricePerUnit: 10 },
      },
    ]);
    expect(prisma.trade.aggregate).toHaveBeenCalledWith({
      _avg: { pricePerUnit: true },
      _min: { pricePerUnit: true },
      where: {
        name: 'wheel',
        pricePerUnit: { gt: 0 },
        count: { gt: 0 },
      },
    });
  });

  it('cannot buy a missing trade or spend more than the buyer owns', async () => {
    const { service, prisma, inventory } = setup();
    prisma.trade.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.buyTrade({ tradeId: 3, resourcesCount: 2 }, buyer),
    ).rejects.toThrow(new ForbiddenException('tradeNotFound'));
    await expect(
      service.buyTrade({ tradeId: 3, resourcesCount: 20 }, buyer),
    ).rejects.toThrow(new ForbiddenException('notEnoughMoney'));
    expect(inventory.addToInventory).not.toHaveBeenCalled();
  });

  it('does not transfer money when the trade has insufficient resources', async () => {
    const { service, prisma } = setup();
    await expect(
      service.buyTrade({ tradeId: 3, resourcesCount: 6 }, buyer),
    ).rejects.toThrow(new ForbiddenException('notEnoughResources'));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('moves stock to the buyer, pays the seller, and awards experience', async () => {
    const { service, prisma, inventory, userService, notifications, updates } = setup();
    await service.buyTrade({ tradeId: 3, resourcesCount: 2 }, buyer);
    expect(prisma.trade.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { count: BigInt(3) },
    });
    expect(inventory.addToInventory).toHaveBeenCalledWith('wheel', BigInt(2), null, 7);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { money: BigInt(80) },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { money: BigInt(70) },
    });
    expect(userService.addExpirience).toHaveBeenCalledWith(buyer, 6);
    expect(notifications.sendTradeBought).toHaveBeenCalledWith(
      seller,
      buyer,
      'wheel',
      2,
    );
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(8);
  });

  it('adds delivered stock to an existing trade or creates a new listing', async () => {
    const { service, prisma, trade } = setup();
    await service.addToTrade('wheel', BigInt(2), 8);
    expect(prisma.trade.create).toHaveBeenCalledWith({
      data: { name: 'wheel', count: BigInt(2), ownerId: 8, pricePerUnit: 0 },
    });
    prisma.trade.findFirst.mockResolvedValue(trade);
    await service.addToTrade('wheel', BigInt(2), 8);
    expect(prisma.trade.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { count: BigInt(7) },
    });
  });

  it('cannot remove stock that is missing or exceeds the listing count', async () => {
    const { service, prisma } = setup();
    prisma.trade.findUnique.mockResolvedValueOnce(null);
    expect(await service.removeFromTrade(3, BigInt(1))).toBe(false);
    expect(await service.removeFromTrade(3, BigInt(6))).toBe(false);
    expect(prisma.trade.update).not.toHaveBeenCalled();
  });

  it('filters only priced and available trades and paginates results', async () => {
    const { service, prisma } = setup();
    await service.getTrades({ page: 2, resources: ['wheel'], nickname: 'seller' });
    expect(prisma.trade.findMany).toHaveBeenCalledWith({
      where: {
        name: { in: ['wheel'] },
        owner: { nickname: 'seller' },
        pricePerUnit: { gt: 0 },
        count: { gt: 0 },
      },
      include: { owner: true },
      skip: 40,
      take: 20,
    });
  });

  it('only lets the owner update a listing price', async () => {
    const { service, prisma } = setup();
    await service.updateTradePrice({ tradeId: 3, price: 12 }, seller);
    expect(prisma.trade.updateMany).toHaveBeenCalledWith({
      where: { id: 3, ownerId: 8 },
      data: { pricePerUnit: 12 },
    });
  });
});
