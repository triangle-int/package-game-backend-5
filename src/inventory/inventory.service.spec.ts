import type { GameConfigService } from '../game-config/game-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { BoosterService } from '../booster/booster.service';
import { MathService } from '../math/math.service';
import { InventoryService } from './inventory.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

type Stock = { id: number; buildingId: number; name: string; count: bigint };

function setup(initial: Stock[] = []) {
  const stock = initial.map((row) => ({ ...row }));
  const storages = [
    { id: 1, ownerId: 7, discriminator: 'storage', level: 0 },
    { id: 2, ownerId: 7, discriminator: 'storage', level: 1 },
  ];
  const factory = { id: 3, ownerId: 7, discriminator: 'factory', level: 1 };
  const findMany = jest.fn(async () =>
    storages.map((storage) => ({
      ...storage,
      inventory: stock
        .filter((row) => row.buildingId === storage.id)
        .map((row) => ({ ...row })),
    })),
  );
  const prisma = {
    building: {
      findMany,
      findUnique: jest.fn(async ({ where }) =>
        where.id === factory.id ? factory : storages.find((s) => s.id === where.id),
      ),
    },
    inventoryItem: {
      findFirst: jest.fn(async ({ where }) =>
        stock.find(
          (row) =>
            row.buildingId === where.buildingId && row.name === where.name,
        ) ?? null,
      ),
      create: jest.fn(async ({ data }) => {
        const row = { id: stock.length + 1, ...data };
        stock.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }) => {
        const row = stock.find((item) => item.id === where.id);
        row.count = data.count;
        return row;
      }),
    },
  };
  const config = { config: { factoryResourcesLimit: 10 } } as GameConfigService;
  const math = new MathService(config);
  const boosters = {
    getBoostedFactoryProduction: jest.fn(async () => 10),
  } as unknown as BoosterService;
  const service = new InventoryService(
    prisma as unknown as PrismaService,
    config,
    math,
    boosters,
  );
  return { service, stock, prisma };
}

describe('InventoryService stock rules', () => {
  it('shows only the player’s storage inventory grouped by storage level', async () => {
    const { service } = setup([
      { id: 1, buildingId: 1, name: 'wheel', count: BigInt(3) },
      { id: 2, buildingId: 2, name: 'motor', count: BigInt(4) },
    ]);
    expect(await service.getUserInventory({ id: 7 } as any)).toEqual({
      0: [{ name: 'wheel', count: BigInt(3) }],
      1: [{ name: 'motor', count: BigInt(4) }],
    });
  });

  it('caps factory output while allowing storage stock to grow', async () => {
    const { service, stock } = setup();

    await service.addToInventory('wheel', BigInt(15), 3);
    expect(stock.find((row) => row.buildingId === 3).count).toBe(BigInt(10));
    await service.addToInventory('wheel', BigInt(5), 3);
    expect(stock.find((row) => row.buildingId === 3).count).toBe(BigInt(10));

    await service.addToInventory('wheel', BigInt(15), 1);
    await service.addToInventory('wheel', BigInt(5), 1);
    expect(stock.find((row) => row.buildingId === 1).count).toBe(BigInt(20));
  });

  it('draws a shipment from multiple owned storages without overdrawing', async () => {
    const { service, stock } = setup([
      { id: 1, buildingId: 1, name: 'wheel', count: BigInt(3) },
      { id: 2, buildingId: 2, name: 'wheel', count: BigInt(4) },
    ]);

    expect(await service.getInventory(7)).toEqual({ wheel: BigInt(7) });
    expect(await service.subtractFromUserStorages(7, 'wheel', BigInt(5))).toBe(
      true,
    );
    expect(stock.map(({ count }) => count)).toEqual([BigInt(0), BigInt(2)]);
    expect(await service.getInventory(7)).toEqual({ wheel: BigInt(2) });
  });

  it('rejects a shipment larger than combined stock and leaves both storages unchanged', async () => {
    const { service, stock, prisma } = setup([
      { id: 1, buildingId: 1, name: 'wheel', count: BigInt(3) },
      { id: 2, buildingId: 2, name: 'wheel', count: BigInt(4) },
    ]);

    expect(await service.subtractFromUserStorages(7, 'wheel', BigInt(8))).toBe(
      false,
    );
    expect(stock.map(({ count }) => count)).toEqual([BigInt(3), BigInt(4)]);
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('does not subtract a missing resource from a building', async () => {
    const { service, prisma } = setup();

    expect(await service.subtractFromInventory('wheel', BigInt(1), 1)).toBe(
      false,
    );
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
  });
});
