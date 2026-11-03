import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import ngeohash from 'ngeohash';
import { UserService } from './user.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../firebase-client/firebase-client.service', () => ({
  FirebaseClientService: class {},
}));
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));
jest.mock('../updates/updates.service', () => ({ UpdatesService: class {} }));
jest.mock('../anticheat/anticheat.service', () => ({ AnticheatService: class {} }));

const user = {
  id: 7,
  gems: BigInt(10),
  experience: BigInt(5),
  level: 0,
} as User;

function setup() {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }) => ({ id: 7, ...data })),
      update: jest.fn(async ({ data }) => ({ ...user, ...data })),
    },
    betaAccessToken: { create: jest.fn().mockResolvedValue({}) },
  };
  const config = {
    config: {
      startMoney: BigInt(100),
      startGems: BigInt(10),
      startLevel: 0,
      startExperience: BigInt(0),
      expreienceForLevel: [BigInt(10), BigInt(20), BigInt(30)],
    },
  };
  const firebase = { getIdToken: jest.fn().mockResolvedValue('firebase-token') };
  const notifications = { sendLevelUp: jest.fn() };
  const updates = {
    sendUserUpdate: jest.fn().mockResolvedValue(undefined),
    isOnline: jest.fn((id) => id === 'online'),
  };
  const anticheat = { checkAndReport: jest.fn().mockResolvedValue(undefined) };
  const service = new UserService(
    prisma as any,
    config as any,
    firebase as any,
    notifications as any,
    updates as any,
    anticheat as any,
  );
  return { service, prisma, firebase, notifications, updates, anticheat };
}

describe('UserService account and progress rules', () => {
  it('refreshes level progress before returning the account', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue(user);
    expect(await service.getMe(user)).toEqual(user);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { experience: BigInt(5), level: 0 },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it('rejects a duplicate nickname and creates a new account with starting balances', async () => {
    const { service, prisma } = setup();
    const dto = { nickname: 'player', avatar: '😀', location: '0,51.5' };
    prisma.user.findUnique.mockResolvedValueOnce({ id: 2 });
    await expect(
      service.createAccount(dto, { uid: 'firebase-7' } as any),
    ).rejects.toThrow(new ForbiddenException('nicknameTaken'));
    const created = await service.createAccount(dto, { uid: 'firebase-7' } as any);
    expect(created).toMatchObject({
      firebaseId: 'firebase-7',
      nickname: 'player',
      money: BigInt(100),
      gems: BigInt(10),
      geohash: ngeohash.encode(0, 51.5),
    });
  });

  it('awards levels only when experience crosses the threshold', async () => {
    const { service, prisma, notifications } = setup();
    const leveled = await service.addExpirience(user, 6);
    expect(leveled.level).toBe(1);
    expect(leveled.experience).toBe(BigInt(1));
    expect(notifications.sendLevelUp).toHaveBeenCalledWith(leveled);
    notifications.sendLevelUp.mockClear();
    const unchanged = await service.addExpirience(user, 2);
    expect(unchanged.level).toBe(0);
    expect(notifications.sendLevelUp).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
  });

  it('adds gems without losing the existing balance and sends an update', async () => {
    const { service, prisma, updates } = setup();
    await service.addGems(user, 5);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { gems: BigInt(15) },
    });
    expect(updates.sendUserUpdate).toHaveBeenCalledWith(7);
  });

  it('records a new location and runs the anticheat check on the same geohash', async () => {
    const { service, prisma, anticheat } = setup();
    await service.setLocation({ location: '51.5,-0.12' }, user);
    const geohash = ngeohash.encode(51.5, -0.12);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { geohash, geohashUpdatedAt: expect.any(Date) },
    });
    expect(anticheat.checkAndReport).toHaveBeenCalledWith(user, geohash);
  });

  it('returns only other players who are online inside map bounds', async () => {
    const { service, prisma, updates } = setup();
    prisma.user.findMany.mockResolvedValue([
      { firebaseId: 'online', geohash: 'u10', avatar: '😀' },
      { firebaseId: 'offline', geohash: 'u10', avatar: '😴' },
    ]);
    const found = await service.getUsersInBounds(
      { minCoords: '51.5,-0.12', maxCoords: '51.5,-0.12' },
      user,
    );
    expect(found).toEqual([{ firebaseId: 'online', geohash: 'u10', avatar: '😀' }]);
    expect(updates.isOnline).toHaveBeenCalledWith('offline');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 7 } }),
      }),
    );
  });

  it('stores tutorial state and creates an admin beta token', async () => {
    const { service, prisma, firebase } = setup();
    await service.setTutorial({ tutorial: 'done' }, user);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { tutorial: 'done' },
    });
    const token = await service.generateBetaToken();
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    expect(prisma.betaAccessToken.create).toHaveBeenCalledWith({
      data: { token },
    });
    expect(await service.getTestToken()).toBe('firebase-token');
    expect(firebase.getIdToken).toHaveBeenCalledTimes(1);
  });
});
