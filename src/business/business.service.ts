import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { GameConfigService } from '../game-config/game-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BusinessInteractDto, GetBusinessDto } from './dto';
import _ from 'lodash';
import { UpdatesService } from '../updates/updates.service';
import { BoosterService } from '../booster/booster.service';

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private config: GameConfigService,
    private inventoryService: InventoryService,
    private updates: UpdatesService,
    private boosters: BoosterService,
  ) {}

  async getUserTax(userId: number) {
    const { _count, _avg } = await this.prisma.building.aggregate({
      where: { ownerId: userId, discriminator: 'business' },
      _count: { id: true },
      _avg: { level: true },
    });

    return Math.max(
      0,
      (_count.id * this.config.config.businessCountMultiplier -
        _avg.level * this.config.config.businessAverageMultiplier) *
        this.config.config.businessTaxMultiplier,
    );
  }

  async getBusiness(dto: GetBusinessDto) {
    const business = await this.prisma.building.findFirst({
      where: {
        id: Number(dto.businessId),
        discriminator: 'business',
      },
      include: {
        owner: true,
      },
    });

    if (business == null) throw new ForbiddenException('businessNotFound');
    return { business, tax: await this.getUserTax(business.ownerId) };
  }

  async collectMoney(dto: BusinessInteractDto, user: User, sendUpdates = true) {
    const business = await this.prisma.building.findFirst({
      where: {
        id: dto.businessId,
        ownerId: user.id,
        discriminator: 'business',
      },
    });

    if (business == null) throw new ForbiddenException('businessNotFound');

    const now = new Date();
    const minutesElapsed = Math.min(
      (now.getTime() - business.updatedAt.getTime()) / 60 / 1000,
      this.config.config.businessFarmLimitHourds * 60,
    );
    const money =
      BigInt(
        Math.floor(
          await this.boosters.getBoostedIncome(
            user.id,
            this.config.config.businessMoneyPerMinute[business.level - 1] *
              minutesElapsed *
              (1 - (await this.getUserTax(user.id))),
          ),
        ),
      ) + (await this.prisma.user.findUnique({ where: { id: user.id } })).money;

    const [updatedBusiness] = await this.prisma.$transaction([
      this.prisma.building.update({
        where: { id: business.id },
        data: { updatedAt: now },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { money },
      }),
    ]);

    if (sendUpdates) this.updates.sendUserUpdate(user.id);
    return updatedBusiness;
  }

  async upgradeBusiness(dto: BusinessInteractDto, user: User) {
    const business = await this.prisma.building.findFirst({
      where: {
        id: dto.businessId,
        ownerId: user.id,
        discriminator: 'business',
      },
    });

    if (business == null) throw new ForbiddenException('businessNotFound');
    if (business.level >= this.config.config.businessCosts.length)
      throw new ForbiddenException('maxLevelReached');

    const count = BigInt(
      await this.boosters.getBoostedCost(
        user.id,
        this.config.config.businessCosts[business.level],
      ),
    );

    if (
      !(await this.inventoryService.subtractFromUserStorages(
        user.id,
        business.resourceToUpgrade1,
        count,
      ))
    )
      throw new ForbiddenException('notEnoughResources');

    const maxLevel = _.max(this.config.config.items.map(({ level }) => level));
    const newLevel = Math.floor(
      Math.min(
        business.level / this.config.config.businessLevelsPerResource + 1,
        maxLevel,
      ),
    );
    const newItem = _.sample(
      this.config.config.items.filter(({ level }) => level === newLevel),
    ).name;

    const [updatedBusiness] = await Promise.all([
      this.prisma.building.update({
        where: { id: business.id },
        data: { level: business.level + 1, resourceToUpgrade1: newItem },
      }),
      this.userService.addExpirience(
        user,
        Math.floor(
          Math.pow(business.level, 1.2) *
            this.config.config.expForBusinessUpgrade,
        ),
      ),
    ]);

    this.updates.sendUserUpdate(user.id);
    return updatedBusiness;
  }
}
