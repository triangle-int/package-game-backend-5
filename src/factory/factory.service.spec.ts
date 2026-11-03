import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { FactoryService } from './factory.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../user/user.service', () => ({ UserService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('../notifications/notifications.service', () => ({ NotificationsService: class {} }));
jest.mock('../schedules/schedules.service', () => ({ SchedulesService: class {} }));
jest.mock('../updates/updates.service', () => ({ UpdatesService: class {} }));
jest.mock('../booster/booster.service', () => ({ BoosterService: class {} }));

const owner = { id: 7, money: BigInt(100) } as User;

function setup() {
  const now = Date.now();
  const factory = {
    id: 3,
    ownerId: 7,
    owner,
    discriminator: 'factory',
    level: 1,
    currentResource: 'wheel',
    resourceToUpgrade1: 'a',
    resourceToUpgrade2: 'b',
    resourceToUpgrade3: 'c',
    enabled: true,
    updatedAt: new Date(now - 5000),
    paymentDate: new Date(now - 3600000),
    turnoffDate: new Date(now - 1800000),
  };
  const prisma = {
    building: {
      findFirst: jest.fn().mockResolvedValue(factory),
      update: jest.fn(async ({ data }) => ({ ...factory, ...data })),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
  const config = {
    config: {
      items: [
        { name: 'wheel', type: 'resource', group: 1, level: 1 },
        { name: 'a', group: 2, level: 1 },
        { name: 'b', group: 2, level: 1 },
        { name: 'c', group: 2, level: 1 },
        { name: 'wheel2', group: 1, level: 2 },
        { name: 'a2', group: 2, level: 2 },
        { name: 'b2', group: 2, level: 2 },
      ],
      factoryStartResrources: 10,
      factoryProductionCost: [20],
      factoryResourcesPerMinute: [60],
      factoryUpgradeCosts: [2, 4],
      factoryLevelsPerResource: 2,
      expForFactoryUpgrade: 5,
    },
  };
  const userService = { addExpirience: jest.fn().mockResolvedValue({}) };
  const inventory = {
    addToInventory: jest.fn().mockResolvedValue(undefined),
    getInventory: jest.fn().mockResolvedValue({ a: BigInt(2), b: BigInt(2), c: BigInt(2) }),
    subtractFromUserStorages: jest.fn().mockResolvedValue(true),
  };
  const notifications = {
    sendFactoryShutDown: jest.fn(),
    sendFactoryFee: jest.fn(),
  };
  const schedules = { addSchedule: jest.fn(), removeSchedule: jest.fn() };
  const updates = { sendUserUpdate: jest.fn() };
  const boosters = {
    getBoostedCost: jest.fn().mockResolvedValue(20),
    getBoostedFactoryProduction: jest.fn().mockResolvedValue(60),
  };
  const service = new FactoryService(
    prisma as any,
    config as any,
    userService as any,
    inventory as any,
    notifications as any,
    schedules as any,
    updates as any,
    boosters as any,
  );
  return {
    service,
    factory,
    prisma,
    config,
    userService,
    inventory,
    notifications,
    schedules,
    updates,
    boosters,
  };
}

describe('FactoryService production and payment rules', () => {
  it('updates accrued production before returning a factory snapshot', async () => {
    const { service, factory, prisma } = setup();
    const update = jest.spyOn(service, 'updateFactoryInventory').mockResolvedValue();
    expect(await service.getFactory({ factoryId: '3' })).toEqual(factory);
    expect(update).toHaveBeenCalledWith(3);
    expect(prisma.building.findFirst).toHaveBeenCalledWith({
      where: { discriminator: 'factory', id: 3 },
      include: { inventory: true, owner: true },
    });
    prisma.building.findFirst.mockResolvedValue(null);
    await expect(service.getFactory({ factoryId: '3' })).rejects.toThrow(
      new ForbiddenException('factoryNotFound'),
    );
  });

  it('rejects an advanced initial resource and an unowned factory', async () => {
    const { service, prisma } = setup();
    await expect(
      service.setFactoryResource({ factoryId: 3, resource: 'wheel2' }, owner),
    ).rejects.toThrow(new ForbiddenException('invalidResource'));
    prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      service.setFactoryResource({ factoryId: 3, resource: 'wheel' }, owner),
    ).rejects.toThrow(new ForbiddenException('factoryNotFound'));
  });

  it('starts production with initial stock and a payment schedule', async () => {
    const { service, factory, inventory, schedules } = setup();
    factory.enabled = false;
    await service.setFactoryResource({ factoryId: 3, resource: 'wheel' }, owner);
    expect(inventory.addToInventory).toHaveBeenCalledWith('wheel', BigInt(10), 3);
    expect(schedules.addSchedule).toHaveBeenCalledWith(
      expect.any(Date),
      'factoryPayment',
      'factoryPayment_3',
      86400000,
      3,
    );
  });

  it('rejects a redundant toggle and stops accrual on shutdown', async () => {
    const { service, factory, schedules, prisma } = setup();
    await expect(
      service.toggleFactory({ factoryId: 3, state: true }, owner),
    ).rejects.toThrow(new ForbiddenException('factoryAlreadyToggled'));
    const updateInventory = jest.spyOn(service, 'updateFactoryInventory').mockResolvedValue();
    await service.toggleFactory({ factoryId: 3, state: false }, owner);
    expect(schedules.removeSchedule).toHaveBeenCalledWith('factoryPayment_3');
    expect(updateInventory).toHaveBeenCalledWith(factory.id);
    expect(prisma.building.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { turnoffDate: expect.any(Date), enabled: false },
    });
  });

  it('shuts down an unpaid factory without debiting its owner', async () => {
    const { service, factory, prisma, notifications, schedules } = setup();
    factory.owner = { ...owner, money: BigInt(10) };
    jest.spyOn(service, 'updateFactoryInventory').mockResolvedValue();
    await service.handleFactoryPayment(3, 'payment-3');
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(schedules.removeSchedule).toHaveBeenCalledWith('payment-3');
    expect(notifications.sendFactoryShutDown).toHaveBeenCalledWith(factory.owner);
  });

  it('debits the daily fee and updates the payment date when funds exist', async () => {
    const { service, prisma, notifications, updates } = setup();
    jest.spyOn(service, 'updateFactoryInventory').mockResolvedValue();
    await service.handleFactoryPayment(3, 'payment-3');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { money: BigInt(80) },
    });
    expect(notifications.sendFactoryFee).toHaveBeenCalledWith(owner, 20);
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
  });

  it('accrues only elapsed production for an enabled factory', async () => {
    const { service, prisma, inventory, factory } = setup();
    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValue(factory.updatedAt.getTime() + 5000);
    try {
      await service.updateFactoryInventory(3);
      expect(inventory.addToInventory).toHaveBeenCalledWith(
        'wheel',
        BigInt(5),
        3,
      );
      prisma.building.findFirst.mockResolvedValue(null);
      inventory.addToInventory.mockClear();
      await service.updateFactoryInventory(factory.id);
      expect(inventory.addToInventory).not.toHaveBeenCalled();
    } finally {
      clock.mockRestore();
    }
  });

  it('requires materials before a factory upgrade', async () => {
    const { service, inventory, prisma } = setup();
    inventory.getInventory.mockResolvedValue({ a: BigInt(1), b: BigInt(2), c: BigInt(2) });
    await expect(service.upgradeFactory({ factoryId: '3' }, owner)).rejects.toThrow(
      new ForbiddenException('notEnoughResources'),
    );
    expect(prisma.building.update).not.toHaveBeenCalled();
  });

  it('consumes all upgrade resources and advances the produced item', async () => {
    const { service, inventory, prisma, userService, updates } = setup();
    jest.spyOn(service, 'updateFactoryInventory').mockResolvedValue();
    const upgraded = await service.upgradeFactory({ factoryId: '3' }, owner);
    expect(inventory.subtractFromUserStorages).toHaveBeenCalledTimes(3);
    expect(inventory.subtractFromUserStorages).toHaveBeenCalledWith(7, 'a', BigInt(2));
    expect(prisma.building.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: expect.objectContaining({ level: 2, currentResource: 'wheel2' }),
    });
    expect(userService.addExpirience).toHaveBeenCalledWith(owner, 10);
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
    expect(upgraded.level).toBe(2);
  });
});
