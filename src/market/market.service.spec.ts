import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import ngeohash from 'ngeohash';
import { MarketService } from './market.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

function setup() {
  const market = {
    id: 11,
    discriminator: 'market',
    level: 1,
    geohash: ngeohash.encode(0.01, 0.01),
  };
  const prisma = {
    building: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(market),
      create: jest.fn(async ({ data }) => ({ id: 11, ...data })),
    },
    inventoryItem: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
  const config = {
    config: {
      marketSearchHashLength: 3,
      maxMarketDistance: 500,
      marketGenerationDistance: 1000,
      minMarketCommission: 0.1,
      maxMarketCommission: 0.3,
      items: [
        { name: 'wheel', group: 1 },
        { name: 'motor', group: 2 },
      ],
    },
  };
  const math = {
    getDistanceBetweenCoords: jest.fn().mockReturnValue(100),
    randomPointFromCoords: jest.fn().mockReturnValue({ lat: 1, lng: 1 }),
    centerCoords: jest.fn().mockReturnValue({ lat: 1, lng: 1 }),
    getCell: jest.fn().mockReturnValue({ code: 'market-cell' }),
    random: jest.fn().mockReturnValue(0.2),
  };
  const service = new MarketService(prisma as any, config as any, math as any);
  return { service, market, prisma, math };
}

describe('MarketService access and generation rules', () => {
  it('returns only items in the market group and the player’s matching stock', async () => {
    const { service, prisma, market } = setup();
    prisma.inventoryItem.findFirst.mockImplementation(async ({ where }) =>
      where.name === 'wheel' ? { name: 'wheel', count: BigInt(3) } : null,
    );
    const found = await service.getMarket({ marketId: '11' }, { id: 7 } as User);
    expect(found).toEqual({
      ...market,
      inventory: [{ name: 'wheel', count: BigInt(3) }],
    });
    expect(prisma.inventoryItem.findFirst).toHaveBeenCalledWith({
      where: { userId: 7, name: 'wheel' },
    });
    expect(prisma.inventoryItem.findFirst).toHaveBeenCalledTimes(1);
  });

  it('rejects a market ID that no longer exists', async () => {
    const { service, prisma } = setup();
    prisma.building.findUnique.mockResolvedValue(null);
    await expect(
      service.getMarket({ marketId: '999' }, { id: 7 } as User),
    ).rejects.toThrow(new ForbiddenException('marketNotFound'));
  });

  it('creates one market per resource group when no nearby market exists', async () => {
    const { service, prisma, math } = setup();
    await service.generateMarkets(ngeohash.encode(0, 0));
    expect(prisma.building.create).toHaveBeenCalledTimes(2);
    expect(prisma.building.create).toHaveBeenCalledWith({
      data: {
        geohash: ngeohash.encode(1, 1),
        discriminator: 'market',
        geohex: 'market-cell',
        level: 1,
        commission: 0.2,
      },
    });
    expect(math.randomPointFromCoords).toHaveBeenCalledTimes(2);
  });

  it('does not create duplicate markets near a factory', async () => {
    const { service, prisma, market } = setup();
    prisma.building.findMany.mockResolvedValue([market]);
    await service.generateMarkets(ngeohash.encode(0, 0));
    expect(prisma.building.create).not.toHaveBeenCalled();
  });
});
