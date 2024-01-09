import { ForbiddenException, Injectable } from '@nestjs/common';
import { Building, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBuildingDto,
  CreateSatelliteDto,
  GetBuildingsDto,
  GetStorageDto,
  RemoveBuildingDto,
} from './dto';
import { GameConfigService } from '../game-config/game-config.service';
import * as ngeohash from 'ngeohash';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { UserService } from '../user/user.service';
import _ from 'lodash';
import { MathService } from '../math/math.service';
import { MarketService } from '../market/market.service';
import { UpdatesService } from '../updates/updates.service';
import { BoosterService } from '../booster/booster.service';

@Injectable()
export class BuildingService {
  constructor(
    private prisma: PrismaService,
    private config: GameConfigService,
    private userService: UserService,
    private mathService: MathService,
    private marketService: MarketService,
    private updates: UpdatesService,
    private boosters: BoosterService,
  ) {}

  async getBuildings(dto: GetBuildingsDto): Promise<Building[]> {
    const [minLat, minLng] = dto.minCoords
      .split(',')
      .map((str) => Number.parseFloat(str));
    const [maxLat, maxLng] = dto.maxCoords
      .split(',')
      .map((str) => Number.parseFloat(str));

    const geohashes = ngeohash.bboxes(minLat, minLng, maxLat, maxLng, 5);
    const buildings = [];

    for (const geohash of geohashes) {
      buildings.push(
        ...(await this.prisma.building.findMany({
          where: {
            geohash: {
              startsWith: geohash,
            },
          },
          select: {
            id: true,
            ownerId: true,
            geohex: true,
            discriminator: true,
            level: true,
            updatedAt: true,
            enabled: true,
            resourceToUpgrade1: true,
          },
        })),
      );
    }

    return buildings;
  }

  async getAllBuildings(): Promise<Building[]> {
    return await this.prisma.building.findMany();
  }

  private async createBuilding(
    dto: CreateBuildingDto,
    cost: bigint,
    user: User,
    building: {
      discriminator: string;
      currentResource?: string;
      resourceToUpgrade1?: string;
      resourceToUpgrade2?: string;
      resourceToUpgrade3?: string;
    },
    level = 1,
  ) {
    cost = BigInt(await this.boosters.getBoostedCost(user.id, Number(cost)));
    if (user.money < cost) throw new ForbiddenException('notEnoughMoney');

    const [lat, lng] = dto.location
      .split(',')
      .map((str) => Number.parseFloat(str));
    const geohex = this.mathService.getCell(lat, lng).code;
    const centered = this.mathService.centerCoords(lat, lng);
    const geohash = ngeohash.encode(centered.lat, centered.lng);

    try {
      const [, createdBuilding] = await this.prisma.$transaction([
        this.prisma.user.update({
          data: {
            money: user.money - cost,
          },
          where: {
            id: user.id,
          },
        }),
        this.prisma.building.create({
          data: {
            discriminator: building.discriminator,
            level,
            geohex,
            geohash,
            currentResource: building.currentResource,
            resourceToUpgrade1: building.resourceToUpgrade1,
            resourceToUpgrade2: building.resourceToUpgrade2,
            resourceToUpgrade3: building.resourceToUpgrade3,
            owner: {
              connect: {
                id: user.id,
              },
            },
          },
        }),
      ]);

      this.updates.sendUserUpdate(user.id);
      return createdBuilding;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        // Duplicated unique field
        if (error.code === 'P2002') {
          throw new ForbiddenException('cellTaken');
        }
      }
    }
  }

  async createBusiness(dto: CreateBuildingDto, user: User) {
    const resource = _.sample(
      this.config.config.items.filter(({ level }) => level === 1),
    ).name;

    const [, business] = await Promise.all([
      this.userService.addExpirience(user, this.config.config.expForBusiness),
      this.createBuilding(
        dto,
        BigInt(this.config.config.businessCosts[0]),
        user,
        {
          discriminator: 'business',
          resourceToUpgrade1: resource,
        },
      ),
    ]);

    return business;
  }

  async createStorage(dto: CreateBuildingDto, user: User) {
    const storages = await this.prisma.building.findMany({
      where: { ownerId: user.id, discriminator: 'storage' },
    });

    if (
      storages.length >=
      this.config.config.storagesLimit +
        Math.floor(user.level / this.config.config.levelsForNextStorage)
    )
      throw new ForbiddenException('tooManyStorages');

    let level = 0;

    while (true) {
      if (storages.find((s) => s.level === level) == null) break;
      level++;
    }

    return await this.createBuilding(
      dto,
      BigInt(this.config.config.storageCost),
      user,
      {
        discriminator: 'storage',
      },
      level,
    );
  }

  async createFactory(dto: CreateBuildingDto, user: User) {
    const resourcesToUpgrade = _.sampleSize(
      this.config.config.items.filter(({ level }) => level === 1),
      3,
    ).map(({ name }) => name);

    const avialableFactories =
      Math.floor(user.level / this.config.config.levelsForNextFactory) + 1;

    const builtFactories = (
      await this.prisma.building.findMany({
        where: {
          ownerId: user.id,
          discriminator: 'factory',
        },
      })
    ).length;

    if (builtFactories >= avialableFactories)
      throw new ForbiddenException('tooManyFactories');

    await this.userService.addExpirience(
      user,
      this.config.config.expForFactory,
    );

    const factory = await this.createBuilding(
      dto,
      BigInt(this.config.config.factoryCost),
      user,
      {
        discriminator: 'factory',
        resourceToUpgrade1: resourcesToUpgrade[0],
        resourceToUpgrade2: resourcesToUpgrade[1],
        resourceToUpgrade3: resourcesToUpgrade[2],
      },
    );

    await this.marketService.generateMarkets(factory.geohash);
    return factory;
  }

  async getStorage(dto: GetStorageDto, user: User) {
    const storage = await this.prisma.building.findFirst({
      where: {
        id: Number.parseInt(dto.buildingId),
        ownerId: user.id,
        discriminator: 'storage',
      },
      include: { inventory: true },
    });

    if (storage == null) throw new ForbiddenException('storageNotFound');
    return storage;
  }

  async removeBuilding(dto: RemoveBuildingDto, user: User) {
    const building = await this.prisma.building.findFirst({
      where: { id: dto.buildingId, ownerId: user.id },
    });

    if (building == null) throw new ForbiddenException('buildingNotFound');

    const truckCheck = await this.prisma.truck.findFirst({
      where: { destinationBuilding: { id: building.id } },
    });

    if (truckCheck != null)
      throw new ForbiddenException('truckGoingToThisBuilding');

    if (building.discriminator === 'factory')
      await this.userService.addExpirience(
        user,
        -this.config.config.expForFactory,
      );

    if (building.discriminator === 'business') {
      let totalExp = this.config.config.expForBusiness;

      for (let level = 1; level < building.level; level++) {
        totalExp += Math.floor(
          Math.pow(level, 1.2) * this.config.config.expForBusinessUpgrade,
        );
      }

      await this.userService.addExpirience(user, -totalExp);
    }

    await this.prisma.building.delete({ where: { id: building.id } });
    this.updates.sendUserUpdate(user.id);
  }

  async createSatellite(dto: CreateSatelliteDto, user: User) {
    const [business, satellite] = await Promise.all([
      this.prisma.building.aggregate({
        _count: true,
        where: { ownerId: user.id, discriminator: 'business' },
      }),
      this.prisma.building.aggregate({
        _count: true,
        where: { ownerId: user.id, discriminator: 'satellite' },
      }),
    ]);

    if (
      business._count / (satellite._count + 1) <
      this.config.config.minBusinessPerSattelite
    )
      throw new ForbiddenException('tooManySatellites');

    return await this.createBuilding(
      dto,
      BigInt(this.config.config.satelliteCosts[dto.level - 1]),
      user,
      {
        discriminator: 'satellite',
      },
      dto.level,
    );
  }
}
