import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import ngeohash from 'ngeohash';
import { TruckService } from './truck.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@nestjs/axios', () => ({ HttpService: class {} }));
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));
jest.mock('../factory/factory.service', () => ({ FactoryService: class {} }));
jest.mock('../trade/trade.service', () => ({ TradeService: class {} }));
jest.mock('../schedules/schedules.service', () => ({ SchedulesService: class {} }));
jest.mock('../updates/updates.service', () => ({ UpdatesService: class {} }));
jest.mock('../booster/booster.service', () => ({ BoosterService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('../task/task.service', () => ({ TaskService: class {} }));

const source = {
  id: 2,
  ownerId: 7,
  discriminator: 'storage',
  geohash: ngeohash.encode(0, 0),
};
const destination = {
  id: 4,
  ownerId: 7,
  discriminator: 'storage',
  geohash: ngeohash.encode(0.1, 0.1),
};
const user = { id: 7, money: BigInt(500) } as User;
const routeDto = { aId: 2, bId: 4, truckType: 1, resourceCount: 100 };
const createDto = {
  ...routeDto,
  resourceName: 'wheel',
  createSchedule: false,
  interval: 0,
};

function setup() {
  const buildings = new Map([
    [2, { ...source }],
    [4, { ...destination }],
  ]);
  const prisma = {
    building: {
      findUnique: jest.fn(async ({ where }) => buildings.get(where.id) ?? null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    truck: {
      create: jest.fn(async ({ data }) => ({ id: 11, ...data })),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({}),
    },
    truckSchedule: {
      create: jest.fn().mockResolvedValue({ id: 12 }),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
  const config = {
    config: {
      truckSpeed: [10, 10, 10],
      trucksCost: [0.05, 0.05, 0.05],
      truckCapacity: [50, 50, 50],
      scheduleInterval: [1, 6, 12],
      destinationsGehash: 4,
      items: [{ name: 'wheel', type: 'resource', group: 1 }],
    },
  };
  const tasks = { addTimeout: jest.fn() };
  const inventory = {
    subtractFromInventory: jest.fn().mockResolvedValue(true),
    addToInventory: jest.fn().mockResolvedValue(undefined),
  };
  const factory = { updateFactoryInventory: jest.fn().mockResolvedValue(undefined) };
  const trade = { addToTrade: jest.fn().mockResolvedValue(undefined) };
  const math = { getDistanceBetweenCoords: jest.fn().mockReturnValue(1000) };
  const notifications = {
    sendTruckCreation: jest.fn(),
    sendTruckArrived: jest.fn(),
  };
  const schedules = { addSchedule: jest.fn(), removeSchedule: jest.fn() };
  const updates = {
    sendUserUpdate: jest.fn(),
    sendTruckCreation: jest.fn(),
    sendTruckArrived: jest.fn(),
  };
  const boosters = {
    getBoostedTruckDuration: jest.fn(async (_id, duration) => duration),
    getBoostedCost: jest.fn(async (_id, cost) => cost),
  };
  const service = new TruckService(
    prisma as any,
    config as any,
    {} as any,
    {} as any,
    tasks as any,
    inventory as any,
    factory as any,
    trade as any,
    math as any,
    notifications as any,
    schedules as any,
    updates as any,
    boosters as any,
  );
  return {
    service,
    buildings,
    prisma,
    tasks,
    inventory,
    factory,
    trade,
    math,
    notifications,
    schedules,
    updates,
    boosters,
  };
}

describe('TruckService route and dispatch rules', () => {
  it('rejects invalid quantities and truck types before querying buildings', async () => {
    const { service, prisma } = setup();
    await expect(
      service.calculatePathCost({ ...routeDto, resourceCount: 0 }, user),
    ).rejects.toThrow(new BadRequestException('invalidResourceCount'));
    await expect(
      service.calculatePathCost({ ...routeDto, truckType: 3 }, user),
    ).rejects.toThrow(new BadRequestException('invalidTruckType'));
    expect(prisma.building.findUnique).not.toHaveBeenCalled();
  });

  it('rejects missing, unowned, and invalid destination buildings', async () => {
    const { service, buildings } = setup();
    await expect(
      service.calculatePathCost({ ...routeDto, bId: 999 }, user),
    ).rejects.toThrow(new ForbiddenException('buildingNotFound'));
    buildings.set(4, { ...destination, ownerId: 8 });
    await expect(service.calculatePathCost(routeDto, user)).rejects.toThrow(
      new ForbiddenException('buildingNotFound'),
    );
    buildings.set(4, { ...destination, discriminator: 'business' });
    await expect(service.calculatePathCost(routeDto, user)).rejects.toThrow(
      new ForbiddenException('invalidDestination'),
    );
  });

  it('rejects a route from a building to itself', async () => {
    const { service } = setup();
    await expect(
      service.calculatePathCost({ ...routeDto, bId: 2 }, user),
    ).rejects.toThrow(new ForbiddenException('invalidTargets'));
  });

  it('calculates capacity-based costs and booster-adjusted travel time', async () => {
    const { service, boosters } = setup();
    boosters.getBoostedCost.mockResolvedValue(40);
    boosters.getBoostedTruckDuration.mockResolvedValue(25);
    const route = await service.calculatePathCost(routeDto, user);
    expect(route.distance).toBe(1000);
    expect(route.duration).toBe(25);
    expect(route.costPerTruck).toBe(40);
    expect(route.cost).toBe(BigInt(80));
    expect(route.geometry).toEqual(expect.any(String));
  });

  it('does not consume inventory or create a courier when funds are insufficient', async () => {
    const { service, prisma, inventory } = setup();
    await expect(
      service.createTruck(createDto, { ...user, money: BigInt(50) }),
    ).rejects.toThrow(new ForbiddenException('notEnoughMoney'));
    expect(inventory.subtractFromInventory).not.toHaveBeenCalled();
    expect(prisma.truck.create).not.toHaveBeenCalled();
  });

  it('does not create a courier when source inventory is insufficient', async () => {
    const { service, prisma, inventory } = setup();
    inventory.subtractFromInventory.mockResolvedValue(false);
    await expect(service.createTruck(createDto, user)).rejects.toThrow(
      new ForbiddenException('incorrectInventory'),
    );
    expect(prisma.truck.create).not.toHaveBeenCalled();
  });

  it('loads a market purchase from the owner’s trade stock', async () => {
    const { service, buildings, inventory } = setup();
    buildings.set(2, {
      ...source,
      ownerId: null,
      discriminator: 'market',
      level: 1,
    } as any);
    await service.createTruck(createDto, user);
    expect(inventory.subtractFromInventory).toHaveBeenCalledWith(
      'wheel',
      BigInt(100),
      null,
      7,
    );
  });

  it('rejects a resource outside the destination market group before consuming stock', async () => {
    const { service, buildings, inventory } = setup();
    buildings.set(4, {
      ...destination,
      ownerId: null,
      discriminator: 'market',
      level: 2,
    } as any);
    await expect(service.createTruck(createDto, user)).rejects.toThrow(
      new ForbiddenException('invalidMarketResource'),
    );
    expect(inventory.subtractFromInventory).not.toHaveBeenCalled();
  });

  it('dispatches a paid courier and schedules its arrival', async () => {
    const { service, prisma, inventory, tasks, updates } = setup();
    const truck = await service.createTruck(createDto, user);
    expect(truck.id).toBe(11);
    expect(inventory.subtractFromInventory).toHaveBeenCalledWith(
      'wheel',
      BigInt(100),
      2,
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      data: { money: BigInt(400) },
      where: { id: 7 },
    });
    expect(tasks.addTimeout).toHaveBeenCalledWith(
      expect.any(Date),
      'truckArrived',
      11,
    );
    expect(updates.sendTruckCreation).toHaveBeenCalledWith(truck);
  });

  it('validates schedule intervals and creates a repeating delivery', async () => {
    const { service, prisma, schedules } = setup();
    await expect(
      service.createTruck({ ...createDto, createSchedule: true, interval: 99 }, user),
    ).rejects.toThrow(new BadRequestException('invalidScheduleInterval'));
    const truck = await service.createTruck(
      { ...createDto, createSchedule: true },
      user,
    );
    expect(truck.scheduleId).toBe(12);
    expect(schedules.addSchedule).toHaveBeenCalledWith(
      expect.any(Date),
      'truckSchedule',
      'truckSchedule_12',
      3600000,
      12,
    );
    expect(prisma.truckSchedule.create).toHaveBeenCalledTimes(1);
  });
});

describe('TruckService arrival and schedule effects', () => {
  it('returns public active couriers and keeps private schedules scoped to the owner', async () => {
    const { service, prisma } = setup();
    const active = [{ id: 11, ownerId: 7 }];
    const schedules = [{ id: 12, ownerId: 7 }];
    prisma.truck.findMany.mockResolvedValue(active);
    prisma.truckSchedule.findMany.mockResolvedValue(schedules);
    expect(await service.getTrucks()).toEqual(active);
    expect(await service.getSchedules(user)).toEqual({ schedules, trucks: active });
    expect(prisma.truckSchedule.findMany).toHaveBeenCalledWith({
      where: { ownerId: 7 },
      include: { trucks: true, start: true, destination: true },
    });
    expect(prisma.truck.findMany).toHaveBeenCalledWith({
      where: { ownerId: 7, scheduleId: null },
      include: { startBuilding: true, destinationBuilding: true },
    });
  });

  it('finds owned delivery starts and nearby public markets', async () => {
    const { service, prisma } = setup();
    const market = { id: 9, discriminator: 'market' };
    let marketSearches = 0;
    prisma.building.findMany.mockImplementation(async ({ where }) => {
      if (where.discriminator?.in) return [source];
      if (where.discriminator === 'storage') return [destination];
      if (where.discriminator === 'market') {
        marketSearches++;
        return marketSearches === 1 ? [market] : [];
      }
      return [];
    });
    const targets = await service.getDeliveryTargets(user);
    expect(targets.starts).toEqual([source, market]);
    expect(targets.destinations).toEqual([destination, market]);
    expect(marketSearches).toBeGreaterThan(1);
  });

  it('removes stale recurring schedules and advances a valid one', async () => {
    const { service, prisma, schedules } = setup();
    await service.handleTruckSchedule(12, 'truckSchedule_12');
    expect(schedules.removeSchedule).toHaveBeenCalledWith('truckSchedule_12');

    prisma.truckSchedule.findUnique.mockResolvedValue({
      id: 12,
      startId: 2,
      destinationId: 4,
      truckType: 1,
      resource: 'wheel',
      resourceCount: 100,
      interval: 0,
      owner: user,
    });
    const dispatch = jest.spyOn(service, 'createTruck').mockResolvedValue({
      path: 'encoded-route',
    } as any);
    await service.handleTruckSchedule(12, 'truckSchedule_12');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        aId: 2,
        bId: 4,
        resourceName: 'wheel',
        createSchedule: false,
      }),
      user,
      12,
    );
    expect(prisma.truckSchedule.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { lastPath: 'encoded-route' },
    });
    expect(prisma.truckSchedule.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { nextTime: expect.any(Date) },
    });
  });

  it('advances the next schedule time even when dispatch fails', async () => {
    const { service, prisma } = setup();
    prisma.truckSchedule.findUnique.mockResolvedValue({
      id: 12,
      startId: 2,
      destinationId: 4,
      truckType: 1,
      resource: 'wheel',
      resourceCount: 100,
      interval: 0,
      owner: user,
    });
    jest.spyOn(service, 'createTruck').mockRejectedValue(
      new ForbiddenException('notEnoughMoney'),
    );
    await service.handleTruckSchedule(12, 'truckSchedule_12');
    expect(prisma.truckSchedule.update).toHaveBeenCalledTimes(1);
    expect(prisma.truckSchedule.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { nextTime: expect.any(Date) },
    });
  });

  it('delivers stock to storage, removes the active courier, and notifies its owner', async () => {
    const { service, prisma, inventory, notifications, updates } = setup();
    const truck = {
      id: 11,
      resource: 'wheel',
      resourceCount: 100,
      ownerId: 7,
      owner: user,
      destinationBuilding: { id: 4, discriminator: 'storage' },
    };
    prisma.truck.findUnique.mockResolvedValue(truck);
    await service.handleTruckArrived(11);
    expect(inventory.addToInventory).toHaveBeenCalledWith('wheel', 100, 4);
    expect(prisma.truck.delete).toHaveBeenCalledWith({ where: { id: 11 } });
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
    expect(notifications.sendTruckArrived).toHaveBeenCalledWith(truck, user);
    expect(updates.sendTruckArrived).toHaveBeenCalledWith(truck);
  });

  it('sells a market-bound delivery instead of adding it to storage', async () => {
    const { service, prisma, trade, inventory } = setup();
    prisma.truck.findUnique.mockResolvedValue({
      id: 11,
      resource: 'wheel',
      resourceCount: 100,
      ownerId: 7,
      owner: user,
      destinationBuilding: { id: 4, discriminator: 'market' },
    });
    await service.handleTruckArrived(11);
    expect(trade.addToTrade).toHaveBeenCalledWith('wheel', 100, 7);
    expect(inventory.addToInventory).not.toHaveBeenCalled();
  });

  it('removes only owned schedules', async () => {
    const { service, prisma, schedules } = setup();
    await service.removeTruckSchedule({ scheduleId: 12 }, user);
    expect(schedules.removeSchedule).not.toHaveBeenCalled();
    prisma.truckSchedule.deleteMany.mockResolvedValue({ count: 1 });
    await service.removeTruckSchedule({ scheduleId: 12 }, user);
    expect(prisma.truckSchedule.deleteMany).toHaveBeenCalledWith({
      where: { id: 12, ownerId: 7 },
    });
    expect(schedules.removeSchedule).toHaveBeenCalledWith('truckSchedule_12');
  });
});
