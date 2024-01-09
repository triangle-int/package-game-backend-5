import {
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { GameConfigService } from '../game-config/game-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CalculatePathDto, RemoveTruckScheduleDto } from './dto';
import ngeohash from 'ngeohash';
import { HttpService } from '@nestjs/axios';
import { CreateTruckDto } from './dto';
import { User } from '@prisma/client';
import { TaskService } from '../task/task.service';
import _ from 'lodash';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from '../inventory/inventory.service';
import { FactoryService } from '../factory/factory.service';
import { TradeService } from '../trade/trade.service';
import { MathService } from '../math/math.service';
import polyline from '@mapbox/polyline';
import { NotificationsService } from '../notifications/notifications.service';
import { SchedulesService } from '../schedules/schedules.service';
import { UpdatesService } from '../updates/updates.service';
import { BoosterService } from '../booster/booster.service';

@Injectable()
export class TruckService {
  constructor(
    private prisma: PrismaService,
    private gameConfig: GameConfigService,
    private config: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private httpService: HttpService,
    private tasks: TaskService,
    private inventoryService: InventoryService,
    private factoryService: FactoryService,
    private tradeService: TradeService,
    private mathService: MathService,
    private notifications: NotificationsService,
    private schedules: SchedulesService,
    private updates: UpdatesService,
    private boosters: BoosterService,
  ) {}

  private async calculatePath(
    dto: CalculatePathDto,
    user: User,
    cache = false,
  ) {
    const [buildingA, buildingB] = await Promise.all([
      this.prisma.building.findUnique({
        where: { id: dto.aId },
      }),
      this.prisma.building.findUnique({
        where: { id: dto.bId },
      }),
    ]);

    if (buildingA == null || buildingB == null)
      throw new ForbiddenException('buildingNotFound');

    if (!_.includes(['factory', 'storage', 'market'], buildingA.discriminator))
      throw new ForbiddenException('invalidStart');

    if (!_.includes(['storage', 'market'], buildingB.discriminator))
      throw new ForbiddenException('invalidDestination');

    if (
      buildingA.discriminator === 'factory' &&
      buildingB.discriminator === 'market'
    )
      throw new ForbiddenException('invalidTargets');

    const coordsA = ngeohash.decode(buildingA.geohash);
    const coordsB = ngeohash.decode(buildingB.geohash);

    const distance = this.mathService.getDistanceBetweenCoords(
      { lat: coordsA.latitude, lng: coordsA.longitude },
      { lat: coordsB.latitude, lng: coordsB.longitude },
    );

    const duration = await this.boosters.getBoostedTruckDuration(
      user.id,
      distance / this.gameConfig.config.truckSpeed[dto.truckType],
    );

    const geometry = polyline.encode(
      [
        [coordsA.latitude, coordsA.longitude],
        [coordsB.latitude, coordsB.longitude],
      ],
      6,
    );

    const costPerTruck = await this.boosters.getBoostedCost(
      user.id,
      Math.ceil(
        distance * this.gameConfig.config.trucksCost[dto.truckType],
      ),
    );

    const cost =
      BigInt(costPerTruck) *
      BigInt(
        Math.ceil(
          dto.resourceCount /
            this.gameConfig.config.truckCapacity[dto.truckType],
        ),
      );

    const route = {
      distance,
      duration,
      geometry,
      costPerTruck,
      cost,
    };

    if (cache)
      this.cacheManager.set(JSON.stringify(dto), route, {
        ttl: 30000,
      });

    return route;
  }

  async calculatePathCost(dto: CalculatePathDto, user: User) {
    return this.calculatePath(dto, user, true);
  }

  async createTruck(
    dto: CreateTruckDto,
    user: User,
    scheduleId: number = null,
  ) {
    const route =
      (await this.cacheManager.get(JSON.stringify(dto as CalculatePathDto))) ??
      ((await this.calculatePath(dto, user)) as any);

    const now = new Date();
    const endTime = new Date(now.getTime() + route.duration * 1000);

    if (user.money < route.cost) throw new ForbiddenException('notEnoughMoney');

    const buildingA = await this.prisma.building.findUnique({
      where: { id: dto.aId },
    });

    await this.factoryService.updateFactoryInventory(buildingA.id);

    const result =
      buildingA.discriminator === 'market'
        ? await this.inventoryService.subtractFromInventory(
            dto.resourceName,
            BigInt(dto.resourceCount),
            null,
            user.id,
          )
        : await this.inventoryService.subtractFromInventory(
            dto.resourceName,
            BigInt(dto.resourceCount),
            buildingA.id,
          );

    if (!result) throw new ForbiddenException('incorrectInventory');

    if (dto.createSchedule) {
      const interval =
        this.gameConfig.config.scheduleInterval[dto.interval] * 3600000;
      const nextTime = new Date(now.getTime() + interval);

      const schedule = await this.prisma.truckSchedule.create({
        data: {
          nextTime,
          resource: dto.resourceName,
          resourceCount: dto.resourceCount,
          truckType: dto.truckType,
          interval: dto.interval,
          ownerId: user.id,
          startId: dto.aId,
          destinationId: dto.bId,
          lastPath: route.geometry,
        },
      });

      scheduleId = schedule.id;

      this.schedules.addSchedule(
        nextTime,
        'truckSchedule',
        `truckSchedule_${schedule.id}`,
        Math.round(interval),
        schedule.id,
      );
    }

    const [truck] = await this.prisma.$transaction([
      this.prisma.truck.create({
        data: {
          startTime: now,
          endTime,
          path: route.geometry,
          startId: dto.aId,
          destinationId: dto.bId,
          resource: dto.resourceName,
          resourceCount: dto.resourceCount,
          truckType: dto.truckType,
          ownerId: user.id,
          scheduleId,
        },
      }),
      this.prisma.user.update({
        data: { money: user.money - route.cost },
        where: { id: user.id },
      }),
    ]);

    this.updates.sendUserUpdate(user.id);
    this.tasks.addTimeout(endTime, 'truckArrived', truck.id);
    this.notifications.sendTruckCreation(truck);
    return truck;
  }

  @OnEvent('truckArrived')
  async handleTruckArrived(truckId: number) {
    const truck = await this.prisma.truck.findUnique({
      where: { id: truckId },
      include: { destinationBuilding: true, owner: true },
    });

    if (truck == null) return;

    if (truck.destinationBuilding.discriminator === 'market') {
      await this.tradeService.addToTrade(
        truck.resource,
        truck.resourceCount,
        truck.ownerId,
      );
    } else {
      await this.inventoryService.addToInventory(
        truck.resource,
        truck.resourceCount,
        truck.destinationBuilding.id,
      );
    }

    await this.prisma.truck.delete({ where: { id: truck.id } });

    if (truck.destinationBuilding.discriminator === 'storage')
      this.updates.sendUserUpdate(truck.ownerId);

    this.notifications.sendTruckArrived(truck, truck.owner);
  }

  @OnEvent('truckSchedule')
  async handleTruckSchedule(truckScheduleId: number, scheduleId: string) {
    const schedule = await this.prisma.truckSchedule.findUnique({
      where: { id: truckScheduleId },
      include: { owner: true },
    });

    if (schedule == null) {
      this.schedules.removeSchedule(scheduleId);
      return;
    }

    const nextTime = new Date(
      Date.now() +
        this.gameConfig.config.scheduleInterval[schedule.interval] * 3600000,
    );

    try {
      const truck = await this.createTruck(
        {
          aId: schedule.startId,
          bId: schedule.destinationId,
          truckType: schedule.truckType,
          resourceName: schedule.resource,
          resourceCount: schedule.resourceCount,
          createSchedule: false,
          interval: schedule.interval,
        },
        schedule.owner,
        schedule.id,
      );
      await this.prisma.truckSchedule.update({
        data: { lastPath: truck.path },
        where: { id: schedule.id },
      });
    } catch (e) {}

    await this.prisma.truckSchedule.update({
      where: { id: schedule.id },
      data: { nextTime },
    });
  }

  async getDeliveryTargets(user: User) {
    const userStarts = await this.prisma.building.findMany({
      where: {
        ownerId: user.id,
        discriminator: { in: ['factory', 'storage'] },
      },
    });

    const userDestinations = await this.prisma.building.findMany({
      where: {
        ownerId: user.id,
        discriminator: 'storage',
      },
    });

    const marketGeohashes = {};
    const markets = [];

    for (const userStart of userStarts) {
      const geohash = userStart.geohash.substring(
        0,
        this.gameConfig.config.destinationsGehash,
      );
      marketGeohashes[geohash] = true;
      const neigbours = ngeohash.neighbors(geohash);

      for (const neigbour of neigbours) {
        marketGeohashes[neigbour] = true;
      }
    }

    for (const geohash of Object.keys(marketGeohashes)) {
      const foundMarkets = await this.prisma.building.findMany({
        where: {
          geohash: {
            startsWith: geohash,
          },
          discriminator: 'market',
        },
      });
      markets.push(...foundMarkets);
    }

    return {
      starts: [...userStarts, ...markets],
      destinations: [...userDestinations, ...markets],
    };
  }

  async getTrucks() {
    return await this.prisma.truck.findMany();
  }

  async getSchedules(user: User) {
    const schedules = await this.prisma.truckSchedule.findMany({
      where: { ownerId: user.id },
      include: { trucks: true, start: true, destination: true },
    });

    const trucks = await this.prisma.truck.findMany({
      where: { ownerId: user.id, scheduleId: null },
      include: { startBuilding: true, destinationBuilding: true },
    });

    return { schedules, trucks };
  }

  async removeTruckSchedule(dto: RemoveTruckScheduleDto, user: User) {
    await this.prisma.truckSchedule.deleteMany({
      where: {
        id: dto.scheduleId,
        ownerId: user.id,
      },
    });
    await this.schedules.removeSchedule(`truckSchedule_${dto.scheduleId}`);
  }
}
