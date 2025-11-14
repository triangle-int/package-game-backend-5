import {
  ForbiddenException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { GameConfigService } from '../game-config/game-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivateBoosterDto } from './dto';
import { User } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { UpdatesService } from '../updates/updates.service';

@Injectable()
export class BoosterService {
  constructor(
    private prisma: PrismaService,
    private config: GameConfigService,
    @Inject(forwardRef(() => InventoryService))
    private inventory: InventoryService,
    @Inject(forwardRef(() => UpdatesService))
    private updates: UpdatesService,
  ) {}

  async getBoosters(user: User) {
    return await this.prisma.booster.findMany({
      where: { userId: user.id },
    });
  }

  async buyBooster(user: User, dto: ActivateBoosterDto) {
    const item = this.config.config.items.find(
      ({ name }) => name === dto.boosterType,
    );

    if (item.type !== 'booster') throw new ForbiddenException('notBooster');
    if (user.gems < item.price) throw new ForbiddenException('notEnoughGems');

    const storage = await this.prisma.building.findFirst({
      where: { ownerId: user.id, discriminator: 'storage' },
    });

    if (storage == null) throw new ForbiddenException('storageNotFound');

    await Promise.all([
      this.inventory.addToInventory(dto.boosterType, BigInt(1), storage.id),
      this.prisma.user.update({
        where: { id: user.id },
        data: { gems: user.gems - BigInt(item.price) },
      }),
    ]);
    this.updates.sendUserUpdate(user.id);
  }

  async activateBooster(user: User, dto: ActivateBoosterDto) {
    const itemType = this.config.config.items.find(
      ({ name }) => name === dto.boosterType,
    )?.type;

    if (itemType !== 'booster') throw new ForbiddenException('notBooster');

    const subtracted = await this.inventory.subtractFromUserStorages(
      user.id,
      dto.boosterType,
      BigInt(1),
    );

    if (!subtracted) throw new ForbiddenException('notEnoughResources');

    const booster = await this.prisma.booster.findFirst({
      where: { userId: user.id, type: dto.boosterType },
    });
    const now = Date.now();
    const duration = this.config.config.boosterDuration * 60 * 60 * 1000;

    const newBooster =
      booster == null
        ? await this.prisma.booster.create({
            data: {
              endsAt: new Date(now + duration),
              type: dto.boosterType,
              userId: user.id,
            },
          })
        : await this.prisma.booster.update({
            where: { id: booster.id },
            data: {
              endsAt: new Date(
                Math.max(booster.endsAt.getTime(), now) + duration,
              ),
            },
          });
    this.updates.sendUserUpdate(user.id);
    return newBooster;
  }

  private async getBoostedValue(
    userId: number,
    boosterType: string,
    value: number,
    factor: number,
  ) {
    const booster = await this.prisma.booster.findFirst({
      where: { userId, type: boosterType },
    });

    return booster != null && booster.endsAt.getTime() >= Date.now()
      ? Math.floor(value * factor)
      : value;
  }

  async getBoostedCost(userId: number, cost: number) {
    return await this.getBoostedValue(
      userId,
      this.config.config.boosterTypes.priceDecrease,
      cost,
      this.config.config.boosterPriceDecreaseFactor,
    );
  }

  async getBoostedIncome(userId: number, income: number) {
    return await this.getBoostedValue(
      userId,
      this.config.config.boosterTypes.businessIncome,
      income,
      this.config.config.boosterIncomeFactor,
    );
  }

  async getBoostedTruckDuration(userId: number, duration: number) {
    return await this.getBoostedValue(
      userId,
      this.config.config.boosterTypes.deliverySpeed,
      duration,
      this.config.config.boosterTruckFactor,
    );
  }

  async getBoostedFactoryProduction(userId: number, production: number) {
    return await this.getBoostedValue(
      userId,
      this.config.config.boosterTypes.factoryProduction,
      production,
      this.config.config.boosterFactoryFactor,
    );
  }
}
