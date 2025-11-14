import { ForbiddenException, Injectable } from '@nestjs/common';
import { FirebaseUser } from '@tfarras/nestjs-firebase-auth';
import { GameConfigService } from '../game-config/game-config.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountDto,
  SetFcmTokenDto,
  SetLocationDto,
  SetTutorialDto,
} from './dto';
import * as ngeohash from 'ngeohash';
import { FirebaseClientService } from '../firebase-client/firebase-client.service';
import { User } from '@prisma/client';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';
import { GetBuildingsDto } from '../building/dto';
import { UpdatesService } from '../updates/updates.service';
import { AnticheatService } from '../anticheat/anticheat.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private gameConfig: GameConfigService,
    private firebaseClient: FirebaseClientService,
    private notifications: NotificationsService,
    private updates: UpdatesService,
    private anticheat: AnticheatService,
  ) {}

  async createAccount(dto: CreateAccountDto, firebaseUser: FirebaseUser) {
    const [lng, lat] = dto.location
      .split(',')
      .map((str) => Number.parseFloat(str));

    const userCheck = await this.prisma.user.findUnique({
      where: { nickname: dto.nickname },
    });

    if (userCheck != null) throw new ForbiddenException('nicknameTaken');

    const user = await this.prisma.user.create({
      data: {
        nickname: dto.nickname,
        firebaseId: firebaseUser.uid,
        avatar: dto.avatar,
        geohash: ngeohash.encode(lng, lat),
        money: this.gameConfig.config.startMoney,
        gems: this.gameConfig.config.startGems,
        level: this.gameConfig.config.startLevel,
        experience: this.gameConfig.config.startExperience,
      },
    });

    return user;
  }

  async getMe(user: User) {
    await this.addExpirience(user, 0);
    return await this.prisma.user.findUnique({ where: { id: user.id } });
  }

  getTestToken(): Promise<string> {
    return this.firebaseClient.getIdToken();
  }

  async generateBetaToken() {
    const betaToken = uuidv4();
    await this.prisma.betaAccessToken.create({ data: { token: betaToken } });
    return betaToken;
  }

  async setFcmToken(dto: SetFcmTokenDto, user: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { fcmToken: dto.fcmToken },
    });
  }

  async addGems(user: User, amount: number) {
    const gems = user.gems + BigInt(amount);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { gems: gems },
    });

    await this.updates.sendUserUpdate(user.id);
  }

  async addExpirience(user: User, amount: number) {
    let experience = user.experience + BigInt(amount);
    let newLevel = user.level;

    while (experience >= this.gameConfig.config.expreienceForLevel[newLevel]) {
      experience -= BigInt(this.gameConfig.config.expreienceForLevel[newLevel]);
      newLevel++;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { experience: experience, level: newLevel },
    });

    if (newLevel > user.level) this.notifications.sendLevelUp(updated);

    return updated;
  }

  async setTutorial(dto: SetTutorialDto, user: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { tutorial: dto.tutorial },
    });
  }

  async setLocation(dto: SetLocationDto, user: User) {
    const [lat, lng] = dto.location
      .split(',')
      .map((str) => Number.parseFloat(str));
    const geohash = ngeohash.encode(lat, lng);

    const [updatedUser] = await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: { geohash, geohashUpdatedAt: new Date() },
      }),
      this.anticheat.checkAndReport(user, geohash),
    ]);

    return updatedUser;
  }

  async getUsersInBounds(dto: GetBuildingsDto, exclude: User) {
    const [minLat, minLng] = dto.minCoords
      .split(',')
      .map((str) => Number.parseFloat(str));
    const [maxLat, maxLng] = dto.maxCoords
      .split(',')
      .map((str) => Number.parseFloat(str));

    const geohashes = ngeohash.bboxes(minLat, minLng, maxLat, maxLng, 5);
    const users = [];

    for (const geohash of geohashes) {
      users.push(
        ...(
          await this.prisma.user.findMany({
            where: {
              geohash: {
                startsWith: geohash,
              },
              id: {
                not: exclude.id,
              },
            },
            select: {
              geohash: true,
              avatar: true,
              firebaseId: true,
            },
          })
        ).filter(({ firebaseId }) => this.updates.isOnline(firebaseId)),
      );
    }

    return users;
  }
}
