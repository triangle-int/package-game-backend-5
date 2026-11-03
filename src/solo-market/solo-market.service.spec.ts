import { BadRequestException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { GameConfigService } from '../game-config/game-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { UpdatesService } from '../updates/updates.service';
import { SoloMarketService } from './solo-market.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

type InventoryRow = {
  id: number;
  buildingId: number;
  name: string;
  count: bigint;
};

type DatabaseState = {
  money: bigint;
  inventory: InventoryRow[];
  nextInventoryId: number;
};

class TransactionalPrismaFake {
  state: DatabaseState;
  failNextInventoryWrite = false;
  failNextUserCredit = false;
  private userLock = Promise.resolve();

  constructor(money: bigint, inventoryCount = BigInt(0)) {
    this.state = {
      money,
      inventory:
        inventoryCount > 0
          ? [
              {
                id: 1,
                buildingId: 10,
                name: 'wheel',
                count: inventoryCount,
              },
            ]
          : [],
      nextInventoryId: 2,
    };
  }

  async $transaction<T>(operation: (tx: any) => Promise<T>): Promise<T> {
    let transactionState: DatabaseState | null = null;
    let release: (() => void) | null = null;
    try {
      const result = await operation(
        this.transactionClient(
          () => {
            if (!transactionState) throw new Error('user row is not locked');
            return transactionState;
          },
          async () => {
            const previous = this.userLock;
            this.userLock = new Promise<void>((resolve) => {
              release = resolve;
            });
            await previous;
            transactionState = {
              money: this.state.money,
              inventory: this.state.inventory.map((item) => ({ ...item })),
              nextInventoryId: this.state.nextInventoryId,
            };
            return [{ id: 1 }];
          },
        ),
      );
      if (!transactionState) throw new Error('user row is not locked');
      this.state = transactionState;
      return result;
    } finally {
      release?.();
    }
  }

  private transactionClient(
    getState: () => DatabaseState,
    lockUser: () => Promise<{ id: number }[]>,
  ) {
    return {
      $queryRaw: lockUser,
      building: {
        findFirst: async () => ({ id: 10 }),
        findMany: async () => [{ id: 10 }],
      },
      user: {
        updateMany: async (args: any) => {
          const state = getState();
          const minimum = args.where.money.gte as bigint;
          if (state.money < minimum) return { count: 0 };
          state.money -= args.data.money.decrement as bigint;
          return { count: 1 };
        },
        findUnique: async () => ({ money: getState().money }),
        update: async (args: any) => {
          const state = getState();
          if (this.failNextUserCredit) {
            this.failNextUserCredit = false;
            throw new Error('credit failed');
          }
          state.money += args.data.money.increment as bigint;
          return { money: state.money };
        },
      },
      inventoryItem: {
        findFirst: async (args: any) => {
          const state = getState();
          const item = state.inventory.find(
            (candidate) =>
              candidate.buildingId === args.where.buildingId &&
              candidate.name === args.where.name,
          );
          return item ? { id: item.id } : null;
        },
        findMany: async (args: any) =>
          getState()
            .inventory.filter(
              (candidate) =>
                args.where.buildingId.in.includes(candidate.buildingId) &&
                candidate.name === args.where.name &&
                candidate.count > 0,
            )
            .map(({ id, count }) => ({ id, count })),
        create: async (args: any) => {
          const state = getState();
          this.maybeFailInventoryWrite();
          const item = {
            id: state.nextInventoryId++,
            buildingId: args.data.buildingId as number,
            name: args.data.name as string,
            count: args.data.count as bigint,
          };
          state.inventory.push(item);
          return item;
        },
        update: async (args: any) => {
          const state = getState();
          this.maybeFailInventoryWrite();
          const item = state.inventory.find(
            (candidate) => candidate.id === args.where.id,
          );
          if (!item) throw new Error('inventory item not found');
          if (args.data.count.increment != null) {
            item.count += args.data.count.increment as bigint;
          }
          if (args.data.count.decrement != null) {
            item.count -= args.data.count.decrement as bigint;
          }
          return item;
        },
      },
    };
  }

  private maybeFailInventoryWrite() {
    if (!this.failNextInventoryWrite) return;
    this.failNextInventoryWrite = false;
    throw new Error('inventory write failed');
  }

  inventoryCount() {
    return this.state.inventory.reduce(
      (total, item) => total + item.count,
      BigInt(0),
    );
  }
}

const user = { id: 1 } as User;
const config = {
  config: {
    items: [{ name: 'wheel', type: 'resource', group: 1, level: 1 }],
  },
} as GameConfigService;

function setup(money: bigint, inventoryCount = BigInt(0)) {
  const prisma = new TransactionalPrismaFake(money, inventoryCount);
  const updates = {
    sendUserUpdate: jest.fn().mockResolvedValue(undefined),
  } as unknown as UpdatesService;
  const service = new SoloMarketService(
    prisma as unknown as PrismaService,
    config,
    updates,
  );
  return { prisma, service, updates };
}

function rejectedWith(
  results: PromiseSettledResult<unknown>[],
  message: string,
) {
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  expect(rejected?.reason).toBeInstanceOf(BadRequestException);
  expect(rejected?.reason.message).toBe(message);
}

describe('SoloMarketService transactions', () => {
  it('allows only one of two concurrent buys when funds cover one', async () => {
    const { prisma, service, updates } = setup(BigInt(300));

    const results = await Promise.allSettled([
      service.buy({ resource: 'wheel', count: 1 }, user),
      service.buy({ resource: 'wheel', count: 1 }, user),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    rejectedWith(results, 'notEnoughMoney');
    expect(prisma.state.money).toBe(BigInt(50));
    expect(prisma.inventoryCount()).toBe(BigInt(1));
    expect(updates.sendUserUpdate).toHaveBeenCalledTimes(1);
  });

  it('allows only one of two concurrent sells when stock covers one', async () => {
    const { prisma, service, updates } = setup(BigInt(0), BigInt(1));

    const results = await Promise.allSettled([
      service.sell({ resource: 'wheel', count: 1 }, user),
      service.sell({ resource: 'wheel', count: 1 }, user),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    rejectedWith(results, 'notEnoughResources');
    expect(prisma.state.money).toBe(BigInt(87));
    expect(prisma.inventoryCount()).toBe(BigInt(0));
    expect(updates.sendUserUpdate).toHaveBeenCalledTimes(1);
  });

  it('rolls back a buy when writing inventory fails', async () => {
    const { prisma, service, updates } = setup(BigInt(300));
    prisma.failNextInventoryWrite = true;

    await expect(
      service.buy({ resource: 'wheel', count: 1 }, user),
    ).rejects.toThrow('inventory write failed');

    expect(prisma.state.money).toBe(BigInt(300));
    expect(prisma.inventoryCount()).toBe(BigInt(0));
    expect(updates.sendUserUpdate).not.toHaveBeenCalled();
  });

  it('rolls back a sell when crediting money fails', async () => {
    const { prisma, service, updates } = setup(BigInt(0), BigInt(1));
    prisma.failNextUserCredit = true;

    await expect(
      service.sell({ resource: 'wheel', count: 1 }, user),
    ).rejects.toThrow('credit failed');

    expect(prisma.state.money).toBe(BigInt(0));
    expect(prisma.inventoryCount()).toBe(BigInt(1));
    expect(updates.sendUserUpdate).not.toHaveBeenCalled();
  });
});
