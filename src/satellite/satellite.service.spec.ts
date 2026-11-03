import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { SatelliteService } from './satellite.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../business/business.service', () => ({ BusinessService: class {} }));
jest.mock('../updates/updates.service', () => ({ UpdatesService: class {} }));

const owner = { id: 7 } as User;

function setup() {
  const satellite = {
    id: 10,
    ownerId: 7,
    geohex: 'parent-cell',
    discriminator: 'satellite',
    level: 1,
  };
  const prisma = {
    building: {
      findFirst: jest.fn().mockResolvedValue(satellite),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const config = { config: { satelliteRadius: [1, 2] } };
  const math = { getCellsInRadius: jest.fn((hex) => [hex]) };
  const businesses = { collectMoney: jest.fn().mockResolvedValue({}) };
  const updates = { sendUserUpdate: jest.fn() };
  const service = new SatelliteService(
    prisma as any,
    config as any,
    math as any,
    businesses as any,
    updates as any,
  );
  return { service, satellite, prisma, math, businesses, updates };
}

describe('SatelliteService nearby business collection', () => {
  it('rejects collecting through a satellite the player does not own', async () => {
    const { service, prisma, businesses } = setup();
    prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      service.collectMoney({ satelliteId: 10 }, owner),
    ).rejects.toThrow(new ForbiddenException('satelliteNotFound'));
    expect(businesses.collectMoney).not.toHaveBeenCalled();
  });

  it('collects each nearby business without sending duplicate account updates', async () => {
    const { service, prisma, businesses, updates, math } = setup();
    prisma.building.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
    const collected = await service.collectMoney({ satelliteId: 10 }, owner);
    expect(businesses.collectMoney).toHaveBeenCalledWith(
      { businessId: 3 },
      owner,
      false,
    );
    expect(businesses.collectMoney).toHaveBeenCalledWith(
      { businessId: 4 },
      owner,
      false,
    );
    expect(businesses.collectMoney).toHaveBeenCalledTimes(2);
    expect(math.getCellsInRadius).toHaveBeenCalledWith('parent-cell', 1);
    expect(updates.sendUserUpdate).toHaveBeenCalledTimes(1);
    expect(collected).toEqual({ id: 10, geohex: 'parent-cell', level: 1 });
  });

  it('walks level-two satellites and excludes already collected businesses', async () => {
    const { service, satellite, prisma, businesses } = setup();
    satellite.level = 2;
    prisma.building.findMany.mockImplementation(async ({ where }) => {
      if (where.discriminator === 'satellite') {
        return [
          { id: 11, geohex: 'child-a', level: 1 },
          { id: 12, geohex: 'child-b', level: 1 },
        ];
      }
      return [{ id: 3 }].filter(({ id }) => !where.id.notIn.includes(id));
    });
    const tree = await service.collectMoney({ satelliteId: 10 }, owner);
    expect(tree['children']).toHaveLength(2);
    expect(businesses.collectMoney).toHaveBeenCalledTimes(1);
    expect(prisma.building.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        discriminator: 'business',
        id: { notIn: [3] },
      }),
    });
  });
});
