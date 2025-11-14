import { ForbiddenException, Injectable } from '@nestjs/common';
import { Building, User } from '@prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import { CollectMoneyDto } from './dto';
import { MathService } from '../math/math.service';
import { BusinessService } from '../business/business.service';
import { PrismaService } from '../prisma/prisma.service';
import _ from 'lodash';
import { UpdatesService } from '../updates/updates.service';

@Injectable()
export class SatelliteService {
  constructor(
    private prisma: PrismaService,
    private config: GameConfigService,
    private math: MathService,
    private businessService: BusinessService,
    private updates: UpdatesService,
  ) {}

  private async getBuildingsInRadius(
    centerHex: string,
    radius: number,
    filters: { [key: string]: any },
  ) {
    const cells = this.math.getCellsInRadius(centerHex, radius);
    const buildings = await this.prisma.building.findMany({
      where: { geohex: { in: cells }, ...filters },
    });

    return buildings;
  }

  private removeFields(satellite: Building) {
    const possibleFields = ['id', 'geohex', 'level'];

    for (const key in satellite) {
      if (!_.includes(possibleFields, key)) delete satellite[key];
    }

    return satellite;
  }

  async collectMoney(dto: CollectMoneyDto, user: User) {
    const satellite = await this.prisma.building.findFirst({
      where: {
        id: dto.satelliteId,
        ownerId: user.id,
        discriminator: 'satellite',
      },
    });

    if (satellite == null) throw new ForbiddenException('satelliteNotFound');

    const visitedBusinessIds: number[] = [];
    const visitedSatelliteIds: number[] = [satellite.id];
    const satellitesToProcess = [this.removeFields(satellite)];

    for (let i = 0; i < satellitesToProcess.length; i++) {
      const satellite = satellitesToProcess[i];
      const searchLevel = satellite.level - 1;

      if (searchLevel > 0) {
        satellite['children'] = (
          await this.getBuildingsInRadius(
            satellite.geohex,
            this.config.config.satelliteRadius[satellite.level - 1],
            {
              ownerId: user.id,
              level: searchLevel,
              discriminator: 'satellite',
              id: { notIn: visitedSatelliteIds },
            },
          )
        ).map((s) => this.removeFields(s));
        visitedSatelliteIds.push(...satellite['children'].map(({ id }) => id));
        satellitesToProcess.push(...satellite['children']);
        continue;
      }

      const businesses = await this.getBuildingsInRadius(
        satellite.geohex,
        this.config.config.satelliteRadius[satellite.level - 1],
        {
          ownerId: user.id,
          discriminator: 'business',
          id: { notIn: visitedBusinessIds },
        },
      );

      for (const business of businesses) {
        visitedBusinessIds.push(business.id);
        await this.businessService.collectMoney(
          { businessId: business.id },
          user,
          false,
        );
      }
    }

    this.updates.sendUserUpdate(user.id);
    return satellite;
  }
}
