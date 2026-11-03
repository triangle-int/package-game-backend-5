import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { BuildingService } from './building.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../user/user.service', () => ({ UserService: class {} }));
jest.mock('../market/market.service', () => ({ MarketService: class {} }));
jest.mock('../updates/updates.service', () => ({ UpdatesService: class {} }));
jest.mock('../booster/booster.service', () => ({ BoosterService: class {} }));

const user = { id: 7, money: BigInt(10000), level: 0 } as User;
const location = { location: '51.5,-0.12' };

function setup() {
  const prisma = {
    building: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      aggregate: jest.fn().mockResolvedValue({ _count: 0 }),
      create: jest.fn(async ({ data }) => ({ id: 3, ...data })),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
    truck: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
  const config = {
    config: {
      items: [
        { name: 'wheel', level: 1 },
        { name: 'a', level: 1 },
        { name: 'b', level: 1 },
      ],
      storagesLimit: 2,
      levelsForNextStorage: 10,
      storageCost: 500,
      levelsForNextFactory: 10,
      factoryCost: 1000,
      expForFactory: 10,
      businessCosts: [300],
      expForBusiness: 5,
      expForBusinessUpgrade: 3,
      minBusinessPerSattelite: 3,
      satelliteCosts: [150],
    },
  };
  const userService = { addExpirience: jest.fn().mockResolvedValue({}) };
  const math = {
    getCell: jest.fn().mockReturnValue({ code: 'cell-1' }),
    centerCoords: jest.fn().mockReturnValue({ lat: 51.5, lng: -0.12 }),
  };
  const market = { generateMarkets: jest.fn().mockResolvedValue(undefined) };
  const updates = { sendUserUpdate: jest.fn() };
  const boosters = { getBoostedCost: jest.fn(async (_id, cost) => cost) };
  const service = new BuildingService(
    prisma as any,
    config as any,
    userService as any,
    math as any,
    market as any,
    updates as any,
    boosters as any,
  );
  return { service, prisma, config, userService, math, market, updates, boosters };
}

describe('BuildingService ownership and construction limits', () => {
  it('creates an owned business and awards construction experience', async () => {
    const { service, prisma, userService } = setup();
    const business = await service.createBusiness(location, user);
    expect(business.discriminator).toBe('business');
    expect(['wheel', 'a', 'b']).toContain(business.resourceToUpgrade1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { money: BigInt(9700) },
    });
    expect(userService.addExpirience).toHaveBeenCalledWith(user, 5);
  });

  it('charges for the first storage and assigns the first free storage level', async () => {
    const { service, prisma, updates } = setup();
    prisma.building.findMany.mockResolvedValue([{ level: 0 }]);
    const storage = await service.createStorage(location, user);
    expect(storage.discriminator).toBe('storage');
    expect(storage.level).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { money: BigInt(9500) },
    });
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
  });

  it('rejects storage beyond the level-based allowance', async () => {
    const { service, prisma } = setup();
    prisma.building.findMany.mockResolvedValue([{ level: 0 }, { level: 1 }]);
    await expect(service.createStorage(location, user)).rejects.toThrow(
      new ForbiddenException('tooManyStorages'),
    );
    expect(prisma.building.create).not.toHaveBeenCalled();
  });

  it('rejects a factory beyond the allowance and generates markets for a valid one', async () => {
    const { service, prisma, market, userService } = setup();
    prisma.building.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(service.createFactory(location, user)).rejects.toThrow(
      new ForbiddenException('tooManyFactories'),
    );
    prisma.building.findMany.mockResolvedValue([]);
    const factory = await service.createFactory(location, user);
    expect(factory.discriminator).toBe('factory');
    expect(market.generateMarkets).toHaveBeenCalledWith(factory.geohash);
    expect(userService.addExpirience).toHaveBeenCalledWith(user, 10);
  });

  it('refuses construction when the owner cannot pay', async () => {
    const { service, prisma } = setup();
    await expect(
      service.createStorage(location, { ...user, money: BigInt(100) }),
    ).rejects.toThrow(new ForbiddenException('notEnoughMoney'));
    expect(prisma.building.create).not.toHaveBeenCalled();
  });

  it('does not expose another player’s storage', async () => {
    const { service, prisma } = setup();
    await expect(service.getStorage({ buildingId: '3' }, user)).rejects.toThrow(
      new ForbiddenException('storageNotFound'),
    );
    prisma.building.findFirst.mockResolvedValue({ id: 3, inventory: [] });
    expect(await service.getStorage({ buildingId: '3' }, user)).toEqual({
      id: 3,
      inventory: [],
    });
  });

  it('does not remove a building with an incoming courier', async () => {
    const { service, prisma } = setup();
    prisma.building.findFirst.mockResolvedValue({ id: 3, discriminator: 'storage' });
    prisma.truck.findFirst.mockResolvedValue({ id: 9 });
    await expect(service.removeBuilding({ buildingId: 3 }, user)).rejects.toThrow(
      new ForbiddenException('truckGoingToThisBuilding'),
    );
    expect(prisma.building.delete).not.toHaveBeenCalled();
  });

  it('reverses factory experience when a factory is removed', async () => {
    const { service, prisma, userService, updates } = setup();
    prisma.building.findFirst.mockResolvedValue({ id: 3, discriminator: 'factory' });
    await service.removeBuilding({ buildingId: 3 }, user);
    expect(userService.addExpirience).toHaveBeenCalledWith(user, -10);
    expect(prisma.building.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
  });

  it('requires enough businesses before building a satellite', async () => {
    const { service, prisma } = setup();
    prisma.building.aggregate
      .mockResolvedValueOnce({ _count: 2 })
      .mockResolvedValueOnce({ _count: 0 });
    await expect(
      service.createSatellite({ ...location, level: 1 }, user),
    ).rejects.toThrow(new ForbiddenException('tooManySatellites'));
    expect(prisma.building.create).not.toHaveBeenCalled();
  });

  it('allows a satellite after enough businesses have been built', async () => {
    const { service, prisma } = setup();
    prisma.building.aggregate
      .mockResolvedValueOnce({ _count: 3 })
      .mockResolvedValueOnce({ _count: 0 });
    const satellite = await service.createSatellite({ ...location, level: 1 }, user);
    expect(satellite.discriminator).toBe('satellite');
    expect(satellite.level).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { money: BigInt(9850) },
    });
  });

  it('removes business experience accumulated across upgrades', async () => {
    const { service, prisma, userService } = setup();
    prisma.building.findFirst.mockResolvedValue({
      id: 3,
      discriminator: 'business',
      level: 3,
    });
    await service.removeBuilding({ buildingId: 3 }, user);
    expect(userService.addExpirience).toHaveBeenCalledWith(
      user,
      -(5 + 3 + Math.floor(Math.pow(2, 1.2) * 3)),
    );
    expect(prisma.building.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it('returns nearby public buildings with owner information', async () => {
    const { service, prisma } = setup();
    const visible = { id: 3, discriminator: 'business', owner: { id: 7 } };
    prisma.building.findMany.mockResolvedValue([visible]);
    expect(await service.getAllBuildings()).toEqual([visible]);
    const result = await service.getBuildings({
      minCoords: '51.5,-0.12',
      maxCoords: '51.5,-0.12',
    });
    expect(result).toContainEqual(visible);
    expect(prisma.building.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        geohash: expect.objectContaining({ startsWith: expect.any(String) }),
      }),
      select: expect.objectContaining({ owner: expect.any(Object) }),
    });
  });
});
