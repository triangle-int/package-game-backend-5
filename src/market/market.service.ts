import { ForbiddenException, Injectable } from '@nestjs/common';
import { GameConfigService } from '../game-config/game-config.service';
import { MathService } from '../math/math.service';
import { PrismaService } from '../prisma/prisma.service';
import _ from 'lodash';
import { User } from '@prisma/client';
import { GetMarketDto } from './dto';
import * as ngeohash from 'ngeohash';

@Injectable()
export class MarketService {
  constructor(
    private prisma: PrismaService,
    private config: GameConfigService,
    private mathService: MathService,
  ) {}

  async generateMarkets(factoryHash: string) {
    const searchHash = factoryHash.substring(
      0,
      this.config.config.marketSearchHashLength,
    );
    const neighbors = [searchHash, ...ngeohash.neighbors(searchHash)];
    const maxMarketGroup = _.max(
      this.config.config.items.map(({ group }) => group),
    );
    const factoryCoords = ngeohash.decode(factoryHash);

    for (let i = 1; i <= maxMarketGroup; i++) {
      let needToGenerate = true;

      for (const hash of neighbors) {
        const markets = await this.prisma.building.findMany({
          where: {
            geohash: { startsWith: hash },
            discriminator: 'market',
            level: i,
          },
        });

        for (const market of markets) {
          const coords = ngeohash.decode(market.geohash);

          if (
            this.mathService.getDistanceBetweenCoords(
              { lat: coords.latitude, lng: coords.longitude },
              { lat: factoryCoords.latitude, lng: factoryCoords.longitude },
            ) <= this.config.config.maxMarketDistance
          ) {
            needToGenerate = false;
          }
        }
      }

      if (!needToGenerate) continue;

      const coords = this.mathService.randomPointFromCoords(
        {
          lat: factoryCoords.latitude,
          lng: factoryCoords.longitude,
        },
        this.config.config.marketGenerationDistance,
      );
      const centered = this.mathService.centerCoords(coords.lat, coords.lng);
      const geohash = ngeohash.encode(centered.lat, centered.lng);
      const geohex = this.mathService.getCell(centered.lat, centered.lng).code;

      try {
        await this.prisma.building.create({
          data: {
            geohash,
            discriminator: 'market',
            geohex,
            level: i,
            commission: this.mathService.random(
              this.config.config.minMarketCommission,
              this.config.config.maxMarketCommission,
            ),
          },
        });
      } catch (e) {
        console.log(`Unable to generate market: ${e}`);
      }
    }
  }

  async getMarket(dto: GetMarketDto, user: User) {
    const market = await this.prisma.building.findUnique({
      where: { id: Number(dto.marketId) },
    });

    if (market == null) throw new ForbiddenException('marketNotFound');

    const items = this.config.config.items.filter(
      ({ group }) => group === market.level,
    );

    const inventory = [];

    for (const item of items) {
      const inventoryItem = await this.prisma.inventoryItem.findFirst({
        where: {
          userId: user.id,
          name: item.name,
        },
      });

      if (inventoryItem != null) inventory.push(inventoryItem);
    }

    return { ...market, inventory };
  }
}
