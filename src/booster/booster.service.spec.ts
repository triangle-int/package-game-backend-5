import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { GameConfigService } from '../game-config/game-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { InventoryService } from '../inventory/inventory.service';
import type { UpdatesService } from '../updates/updates.service';
import { BoosterService } from './booster.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const user = { id: 7, gems: BigInt(20) } as User;
const config = {
  config: {
    items: [
      { name: 'speed', type: 'booster', price: 5 },
      { name: 'wheel', type: 'resource', price: 1 },
    ],
    boosterDuration: 2,
    boosterTypes: {
      priceDecrease: 'speed',
      businessIncome: 'speed',
      deliverySpeed: 'speed',
      factoryProduction: 'speed',
    },
    boosterPriceDecreaseFactor: 0.75,
    boosterIncomeFactor: 1.5,
    boosterTruckFactor: 0.5,
    boosterFactoryFactor: 2,
  },
} as GameConfigService;

function setup() {
  const prisma = {
    booster: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }) => ({ id: 1, ...data })),
      update: jest.fn(async ({ data }) => ({ id: 1, ...data })),
    },
    building: { findFirst: jest.fn().mockResolvedValue({ id: 10 }) },
    user: { update: jest.fn().mockResolvedValue({}) },
  };
  const inventory = {
    addToInventory: jest.fn().mockResolvedValue(undefined),
    subtractFromUserStorages: jest.fn().mockResolvedValue(true),
  };
  const updates = { sendUserUpdate: jest.fn() };
  const service = new BoosterService(
    prisma as unknown as PrismaService,
    config,
    inventory as unknown as InventoryService,
    updates as unknown as UpdatesService,
  );
  return { service, prisma, inventory, updates };
}

describe('BoosterService purchase and activation rules', () => {
  it('rejects a resource sold as a booster and does not spend gems', async () => {
    const { service, prisma } = setup();
    await expect(
      service.buyBooster(user, { boosterType: 'wheel' }),
    ).rejects.toThrow(new ForbiddenException('notBooster'));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a purchase without enough gems or storage', async () => {
    const { service, prisma, inventory } = setup();
    await expect(
      service.buyBooster({ ...user, gems: BigInt(4) }, { boosterType: 'speed' }),
    ).rejects.toThrow(new ForbiddenException('notEnoughGems'));
    prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      service.buyBooster(user, { boosterType: 'speed' }),
    ).rejects.toThrow(new ForbiddenException('storageNotFound'));
    expect(inventory.addToInventory).not.toHaveBeenCalled();
  });

  it('adds a purchased booster to storage and debits the correct gems', async () => {
    const { service, prisma, inventory, updates } = setup();
    await service.buyBooster(user, { boosterType: 'speed' });
    expect(inventory.addToInventory).toHaveBeenCalledWith('speed', BigInt(1), 10);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { gems: BigInt(15) },
    });
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
  });

  it('requires an owned booster item before activation', async () => {
    const { service, inventory, prisma } = setup();
    await expect(
      service.activateBooster(user, { boosterType: 'wheel' }),
    ).rejects.toThrow(new ForbiddenException('notBooster'));
    inventory.subtractFromUserStorages.mockResolvedValue(false);
    await expect(
      service.activateBooster(user, { boosterType: 'speed' }),
    ).rejects.toThrow(new ForbiddenException('notEnoughResources'));
    expect(prisma.booster.create).not.toHaveBeenCalled();
  });

  it('starts a boost and extends its remaining duration on reactivation', async () => {
    const { service, prisma, updates } = setup();
    const now = Date.now();
    const first = await service.activateBooster(user, { boosterType: 'speed' });
    expect(first.endsAt.getTime()).toBeGreaterThanOrEqual(now + 2 * 3600000);
    const existing = { id: 1, endsAt: new Date(now + 3600000) };
    prisma.booster.findFirst.mockResolvedValue(existing);
    const renewed = await service.activateBooster(user, { boosterType: 'speed' });
    expect(renewed.endsAt.getTime()).toBeGreaterThanOrEqual(
      existing.endsAt.getTime() + 2 * 3600000,
    );
    expect(updates.sendUserUpdate).toHaveBeenCalledTimes(2);
  });

  it('applies active multipliers and ignores expired boosts', async () => {
    const { service, prisma } = setup();
    prisma.booster.findFirst.mockResolvedValue({
      endsAt: new Date(Date.now() + 60000),
    });
    expect(await service.getBoostedCost(7, 101)).toBe(75);
    expect(await service.getBoostedIncome(7, 100)).toBe(150);
    expect(await service.getBoostedTruckDuration(7, 100)).toBe(50);
    expect(await service.getBoostedFactoryProduction(7, 100)).toBe(200);

    prisma.booster.findFirst.mockResolvedValue({
      endsAt: new Date(Date.now() - 60000),
    });
    expect(await service.getBoostedCost(7, 101)).toBe(101);
    expect(await service.getBoostedTruckDuration(7, 100)).toBe(100);
  });
});
