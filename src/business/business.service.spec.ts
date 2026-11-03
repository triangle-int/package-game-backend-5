import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { BusinessService } from './business.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../user/user.service', () => ({ UserService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('../updates/updates.service', () => ({ UpdatesService: class {} }));
jest.mock('../booster/booster.service', () => ({ BoosterService: class {} }));

const owner = { id: 7, money: BigInt(100) } as User;

function setup() {
  const business = {
    id: 3,
    ownerId: 7,
    level: 1,
    resourceToUpgrade1: 'wheel',
    updatedAt: new Date(Date.now() - 30 * 60000),
  };
  const prisma = {
    building: {
      count: jest.fn().mockResolvedValue(1),
      aggregate: jest.fn().mockResolvedValue({ _avg: { level: 1 } }),
      findFirst: jest.fn().mockResolvedValue(business),
      update: jest.fn(async ({ data }) => ({ ...business, ...data })),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(owner),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
  const config = {
    config: {
      businessCountMultiplier: 0.2,
      businessAverageMultiplier: 0.1,
      businessTaxMultiplier: 1,
      businessFarmLimitHourds: 1,
      businessMoneyPerMinute: [10],
      businessCosts: [100, 5],
      businessLevelsPerResource: 1,
      expForBusinessUpgrade: 10,
      items: [{ name: 'wheel', level: 1 }, { name: 'motor', level: 2 }],
    },
  };
  const userService = { addExpirience: jest.fn().mockResolvedValue({}) };
  const inventory = { subtractFromUserStorages: jest.fn().mockResolvedValue(true) };
  const updates = { sendUserUpdate: jest.fn() };
  const boosters = {
    getBoostedIncome: jest.fn(async (_id, amount) => amount),
    getBoostedCost: jest.fn().mockResolvedValue(5),
  };
  const service = new BusinessService(
    prisma as any,
    userService as any,
    config as any,
    inventory as any,
    updates as any,
    boosters as any,
  );
  return { service, business, prisma, inventory, userService, updates, boosters };
}

describe('BusinessService income and upgrades', () => {
  it('calculates tax from count and level without going below zero', async () => {
    const { service, prisma } = setup();
    expect(await service.getUserTax(7)).toBeCloseTo(0.1);
    prisma.building.aggregate.mockResolvedValue({ _avg: { level: 10 } });
    expect(await service.getUserTax(7)).toBe(0);
  });

  it('rejects an unknown business and returns tax for a known one', async () => {
    const { service, prisma, business } = setup();
    prisma.building.findFirst.mockResolvedValueOnce(null);
    await expect(service.getBusiness({ businessId: '3' })).rejects.toThrow(
      new ForbiddenException('businessNotFound'),
    );
    expect(await service.getBusiness({ businessId: '3' })).toEqual({
      business,
      tax: 0.1,
    });
  });

  it('collects only capped elapsed income and records the new balance', async () => {
    const { service, business, prisma, updates, boosters } = setup();
    business.updatedAt = new Date(Date.now() - 2 * 3600000);
    await service.collectMoney({ businessId: 3 }, owner);
    expect(boosters.getBoostedIncome).toHaveBeenCalledWith(7, expect.any(Number));
    expect(boosters.getBoostedIncome.mock.calls[0][1]).toBeCloseTo(540);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { money: BigInt(640) },
    });
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
  });

  it('requires upgrade stock before spending it', async () => {
    const { service, inventory, prisma } = setup();
    inventory.subtractFromUserStorages.mockResolvedValue(false);
    await expect(service.upgradeBusiness({ businessId: 3 }, owner)).rejects.toThrow(
      new ForbiddenException('notEnoughResources'),
    );
    expect(prisma.building.update).not.toHaveBeenCalled();
  });

  it('consumes upgrade materials, advances level, and awards experience', async () => {
    const { service, inventory, prisma, userService, updates } = setup();
    const upgraded = await service.upgradeBusiness({ businessId: 3 }, owner);
    expect(inventory.subtractFromUserStorages).toHaveBeenCalledWith(
      7,
      'wheel',
      BigInt(5),
    );
    expect(prisma.building.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { level: 2, resourceToUpgrade1: 'motor' },
    });
    expect(userService.addExpirience).toHaveBeenCalledWith(owner, 10);
    expect(upgraded.level).toBe(2);
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
  });
});
