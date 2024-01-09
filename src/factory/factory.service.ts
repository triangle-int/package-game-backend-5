import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import { InventoryService } from '../inventory/inventory.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { SetFactoryResourceDto, ToggleFactoryDto, GetFactoryDto } from './dto';
import _ from 'lodash';
import { NotificationsService } from '../notifications/notifications.service';
import { OnEvent } from '@nestjs/event-emitter';
import { SchedulesService } from '../schedules/schedules.service';
import { UpdatesService } from '../updates/updates.service';
import { BoosterService } from '../booster/booster.service';

@Injectable()
export class FactoryService {
  constructor(
    private prisma: PrismaService,
    private config: GameConfigService,
    private userService: UserService,
    private inventoryService: InventoryService,
    private notifications: NotificationsService,
    private schedules: SchedulesService,
    private updates: UpdatesService,
    private boosters: BoosterService,
  ) {}

  async setFactoryResource(dto: SetFactoryResourceDto, user: User) {
    const item = this.config.config.items.find(
      (item) => item.name === dto.resource,
    );

    if (item.level > 1) throw new ForbiddenException('invalidResource');

    const factory = await this.prisma.building.findFirst({
      where: {
        id: dto.factoryId,
        ownerId: user.id,
        discriminator: 'factory',
        currentResource: null,
      },
    });

    if (factory == null) throw new ForbiddenException('factoryNotFound');

    const [, , result] = await Promise.all([
      this.prisma.building.update({
        where: { id: factory.id },
        data: {
          currentResource: dto.resource,
        },
      }),
      this.inventoryService.addToInventory(
        dto.resource,
        BigInt(this.config.config.factoryStartResrources),
        factory.id,
      ),
      this.toggleFactory({ factoryId: factory.id, state: true }, user),
    ]);

    return result;
  }

  async toggleFactory(dto: ToggleFactoryDto, user: User) {
    const factory = await this.prisma.building.findFirst({
      where: { id: dto.factoryId, ownerId: user.id },
    });

    if (factory == null) throw new ForbiddenException('factoryNotFound');

    if (factory.enabled === dto.state)
      throw new ForbiddenException('factoryAlreadyToggled');

    const now = new Date();

    if (dto.state) {
      const nextCallTimespan = 1000 * 60 * 60 * 24;

      const nextPaymentDate = new Date(
        now.getTime() +
          nextCallTimespan -
          (factory.turnoffDate.getTime() - factory.paymentDate.getTime()),
      );

      this.schedules.addSchedule(
        nextPaymentDate,
        'factoryPayment',
        `factoryPayment_${factory.id}`,
        nextCallTimespan,
        factory.id,
      );

      return await this.prisma.building.update({
        where: { id: factory.id },
        data: { enabled: true },
      });
    } else {
      this.schedules.removeSchedule(`factoryPayment_${factory.id}`);

      const [, updatedFactory] = await Promise.all([
        this.updateFactoryInventory(factory.id),
        this.prisma.building.update({
          where: { id: factory.id },
          data: { turnoffDate: now, enabled: false },
        }),
      ]);

      return updatedFactory;
    }
  }

  @OnEvent('factoryPayment')
  async handleFactoryPayment(factoryId: number, scheduleId: string) {
    const factory = await this.prisma.building.findFirst({
      where: { id: factoryId, enabled: true },
      include: { owner: true },
    });

    if (factory == null) {
      this.schedules.removeSchedule(scheduleId);
      return;
    }

    await this.updateFactoryInventory(factory.id);
    const cost = await this.boosters.getBoostedCost(
      factory.owner.id,
      this.config.config.factoryProductionCost[factory.level - 1],
    );
    const now = new Date();

    if (factory.owner.money < BigInt(cost)) {
      await this.prisma.building.update({
        where: { id: factory.id },
        data: { enabled: false, turnoffDate: now },
      });
      this.schedules.removeSchedule(scheduleId);
      this.notifications.sendFactoryShutDown(factory.owner);
      return;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: factory.ownerId,
        },
        data: {
          money: factory.owner.money - BigInt(cost),
        },
      }),
      this.prisma.building.update({
        where: { id: factory.id },
        data: { paymentDate: now },
      }),
    ]);

    this.notifications.sendFactoryFee(factory.owner, cost);
    this.updates.sendUserUpdate(factory.owner.id);
  }

  async updateFactoryInventory(factoryId: number) {
    const factory = await this.prisma.building.findFirst({
      where: { id: factoryId, discriminator: 'factory', enabled: true },
    });

    if (factory == null) return;

    const now = Date.now();
    const rate =
      (await this.boosters.getBoostedFactoryProduction(
        factory.ownerId,
        this.config.config.factoryResourcesPerMinute[factory.level - 1],
      )) / 60000;
    const resources = rate * (now - factory.updatedAt.getTime());

    await Promise.all([
      this.inventoryService.addToInventory(
        factory.currentResource,
        BigInt(Math.floor(resources)),
        factory.id,
      ),
      this.prisma.building.update({
        where: { id: factory.id },
        data: {
          updatedAt: new Date(now),
        },
      }),
    ]);
  }

  async upgradeFactory(dto: GetFactoryDto, user: User) {
    const factory = await this.prisma.building.findFirst({
      where: {
        id: Number(dto.factoryId),
        ownerId: user.id,
        discriminator: 'factory',
        level: { lt: this.config.config.factoryUpgradeCosts.length },
      },
    });

    if (factory == null) throw new ForbiddenException('factoryNotFound');

    const userInventory = await this.inventoryService.getInventory(user.id);
    const itemCount = BigInt(
      this.config.config.factoryUpgradeCosts[factory.level - 1],
    );

    if (
      (userInventory[factory.resourceToUpgrade1] ?? 0) >= itemCount &&
      (userInventory[factory.resourceToUpgrade2] ?? 0) >= itemCount &&
      (userInventory[factory.resourceToUpgrade3] ?? 0) >= itemCount
    ) {
      await Promise.all([
        this.inventoryService.subtractFromUserStorages(
          user.id,
          factory.resourceToUpgrade1,
          itemCount,
        ),
        this.inventoryService.subtractFromUserStorages(
          user.id,
          factory.resourceToUpgrade2,
          itemCount,
        ),
        this.inventoryService.subtractFromUserStorages(
          user.id,
          factory.resourceToUpgrade3,
          itemCount,
        ),
      ]);

      this.updates.sendUserUpdate(user.id);
    } else {
      throw new ForbiddenException('notEnoughResources');
    }

    await this.updateFactoryInventory(Number(dto.factoryId));

    const resourceLevel =
      Math.floor(
        (factory.level + 1) / this.config.config.factoryLevelsPerResource,
      ) + 1;
    const currentItem = this.config.config.items.find(
      (item) => item.name === factory.currentResource,
    );

    const mainResource = this.config.config.items.find(
      ({ group, level }) =>
        group === currentItem.group && level === resourceLevel,
    );
    const resourcesToUpgrade = _.sampleSize(
      this.config.config.items.filter(({ level }) => level === resourceLevel),
      3,
    );

    const upgradedFactory = await this.prisma.building.update({
      where: { id: factory.id },
      data: {
        level: factory.level + 1,
        resourceToUpgrade1: resourcesToUpgrade[0].name,
        resourceToUpgrade2: resourcesToUpgrade[1].name,
        resourceToUpgrade3: resourcesToUpgrade[2].name,
        currentResource: mainResource.name,
      },
    });
    await this.userService.addExpirience(
      user,
      upgradedFactory.level * this.config.config.expForFactoryUpgrade,
    );
    this.updates.sendUserUpdate(user.id);
    return upgradedFactory;
  }

  async getFactory(dto: GetFactoryDto) {
    await this.updateFactoryInventory(Number(dto.factoryId));

    const factory = await this.prisma.building.findFirst({
      where: {
        discriminator: 'factory',
        id: Number(dto.factoryId),
      },
      include: {
        inventory: true,
        owner: true,
      },
    });

    if (factory == null) throw new ForbiddenException('factoryNotFound');
    return factory;
  }
}
