import { UpdatesService } from './updates.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../inventory/inventory.service', () => ({ InventoryService: class {} }));
jest.mock('./updates.gateway', () => ({ UpdatesGateway: class {} }));

function setup() {
  const user = { id: 7, firebaseId: 'firebase-7', money: BigInt(100) };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
  };
  const inventory = { getUserInventory: jest.fn().mockResolvedValue({
    0: [{ name: 'wheel', count: BigInt(3) }],
  }) };
  const gateway = {
    sendData: jest.fn(),
    sendBroadcast: jest.fn(),
    isOnline: jest.fn().mockReturnValue(true),
  };
  const service = new UpdatesService(prisma as any, inventory as any, gateway as any);
  return { service, user, prisma, inventory, gateway };
}

describe('UpdatesService public and private event delivery', () => {
  it('sends balance and inventory only to the account owner', async () => {
    const { service, user, inventory, gateway } = setup();
    await service.sendUserUpdate(7);
    expect(inventory.getUserInventory).toHaveBeenCalledWith(user);
    expect(gateway.sendData).toHaveBeenCalledWith('update', 'firebase-7', {
      ...user,
      inventory: { 0: [{ name: 'wheel', count: BigInt(3) }] },
    });
    expect(gateway.sendBroadcast).not.toHaveBeenCalled();
  });

  it('does not emit a private update for a deleted account', async () => {
    const { service, prisma, gateway } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    await service.sendUserUpdate(7);
    expect(gateway.sendData).not.toHaveBeenCalled();
  });

  it('sends ban state only to the affected account', async () => {
    const { service, prisma, gateway } = setup();
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      firebaseId: 'firebase-7',
      ban: { reason: 'abuse' },
    });
    await service.sendBanUpdate(7);
    expect(gateway.sendData).toHaveBeenCalledWith(
      'banUpdate',
      'firebase-7',
      { reason: 'abuse' },
    );
  });

  it('broadcasts courier creation and arrival without private account data', () => {
    const { service, gateway } = setup();
    const courier = { id: 11, ownerId: 7, resource: 'wheel' };
    service.sendTruckCreation(courier as any);
    service.sendTruckArrived(courier);
    expect(gateway.sendBroadcast).toHaveBeenCalledWith('truckCreated', courier);
    expect(gateway.sendBroadcast).toHaveBeenCalledWith('truckArrived', {
      id: 11,
      ownerId: 7,
    });
    expect(service.isOnline('firebase-7')).toBe(true);
    expect(gateway.isOnline).toHaveBeenCalledWith('firebase-7');
  });
});
