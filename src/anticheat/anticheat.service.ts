import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { DiscordService } from '../discord/discord.service';
import { GameConfigService } from '../game-config/game-config.service';
import { Coords, MathService } from '../math/math.service';
import * as ngeohash from 'ngeohash';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnticheatService {
  constructor(
    private math: MathService,
    private discord: DiscordService,
    private gameConfig: GameConfigService,
    private config: ConfigService,
  ) {}

  async checkAndReport(user: User, newGeohash: string) {
    const elapsedTime = (Date.now() - user.geohashUpdatedAt.getTime()) / 1000;
    const oldCoords = ngeohash.decode(user.geohash);
    const newCoords = ngeohash.decode(newGeohash);

    const distance = this.math.getDistanceBetweenCoords(
      { lat: oldCoords.latitude, lng: oldCoords.longitude },
      { lat: newCoords.latitude, lng: newCoords.longitude },
    );
    const speed = distance / elapsedTime;

    if (
      distance < this.gameConfig.config.anicheatMinDistance ||
      speed < this.gameConfig.config.anicheatMaxSpeed
    )
      return;

    this.discord.sendWarning(
      `User ${user.nickname} ${user.avatar} may be cheating!`,
      `He travelled ${this.math.round(distance, 2)} meters in ${this.math.round(
        elapsedTime,
        2,
      )} seconds reaching speed of ${this.math.round(
        speed,
        2,
      )} meters per second!`,
      this.getImageUrl(
        { lat: oldCoords.latitude, lng: oldCoords.longitude },
        { lat: newCoords.latitude, lng: newCoords.longitude },
      ),
    );
  }

  getImageUrl(oldLocation: Coords, newLocation: Coords) {
    return `https://tiles.stadiamaps.com/static/alidade_smooth_dark?api_key=${this.config.get(
      'MAPS_TOKEN',
    )}&size=500x500&markers=${oldLocation.lat},${oldLocation.lng},,,A&markers=${
      newLocation.lat
    },${newLocation.lng},,,B`;
  }
}
