import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { GameConfigService } from '../src/game-config/game-config.service';
import { BigIntInterceptor } from '../src/helpers/interceptor/big-int.interceptor';
import {
  users,
  buildings,
  businesses,
  factories,
  inventory,
  markets,
  satellites,
  trucks,
  trades,
  boosters,
} from '.';

describe('App e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    app.useGlobalInterceptors(new BigIntInterceptor());

    await app.init();
    await app.listen(0, '127.0.0.1');

    const prisma = app.get(PrismaService);
    await prisma.cleanDb();

    const address = app.getHttpServer().address();
    pactum.request.setBaseUrl(`http://127.0.0.1:${address.port}`);
  });

  afterAll(() => {
    app.close();
  });

  const spec = () =>
    pactum.spec().withHeaders({
      Authorization: 'Bearer $S{userToken}',
      betaAccessToken: '$S{betaToken}',
      version: app.get(GameConfigService).config.versions.at(-1),
      adminPassword: app.get(ConfigService).get('ADMIN_PASSWORD'),
    });
  const getApp = () => app;

  users(spec);
  buildings(spec);
  businesses(spec, getApp);
  factories(spec);
  inventory(spec);
  markets(spec, getApp);
  satellites(spec);
  trucks(spec, getApp);
  trades(spec, getApp);
  boosters(spec);
});
