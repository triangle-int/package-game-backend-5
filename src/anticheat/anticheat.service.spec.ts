import type { User } from '@prisma/client';
import ngeohash from 'ngeohash';
import { AnticheatService } from './anticheat.service';

jest.mock('../discord/discord.service', () => ({ DiscordService: class {} }));

const now = new Date('2026-01-01T00:00:10.000Z').getTime();

function setup(distance: number) {
  const user = {
    id: 7,
    nickname: 'player',
    avatar: '😀',
    geohash: ngeohash.encode(51.5, -0.12),
    geohashUpdatedAt: new Date(now - 10000),
  } as User;
  const math = {
    getDistanceBetweenCoords: jest.fn().mockReturnValue(distance),
    round: jest.fn((value) => Math.round(value * 100) / 100),
  };
  const discord = { sendWarning: jest.fn() };
  const gameConfig = {
    config: { anicheatMinDistance: 100, anicheatMaxSpeed: 50 },
  };
  const config = { get: jest.fn().mockReturnValue('preview-token') };
  const service = new AnticheatService(
    math as any,
    discord as any,
    gameConfig as any,
    config as any,
  );
  return { service, user, math, discord };
}

describe('AnticheatService movement checks', () => {
  it('does not report short movements or plausible speed', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const shortMove = setup(50);
      await shortMove.service.checkAndReport(
        shortMove.user,
        ngeohash.encode(51.51, -0.11),
      );
      expect(shortMove.discord.sendWarning).not.toHaveBeenCalled();

      const slowMove = setup(200);
      await slowMove.service.checkAndReport(
        slowMove.user,
        ngeohash.encode(51.51, -0.11),
      );
      expect(slowMove.discord.sendWarning).not.toHaveBeenCalled();
    } finally {
      clock.mockRestore();
    }
  });

  it('reports implausible travel with both map markers', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const { service, user, discord } = setup(1000);
      await service.checkAndReport(user, ngeohash.encode(51.6, -0.02));
      expect(discord.sendWarning).toHaveBeenCalledWith(
        expect.stringContaining('player'),
        expect.stringContaining('100 meters per second'),
        expect.stringContaining('markers='),
      );
      expect(discord.sendWarning.mock.calls[0][2]).toContain('&markers=');
    } finally {
      clock.mockRestore();
    }
  });
});
