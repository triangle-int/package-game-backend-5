import { INestApplication } from '@nestjs/common';
import Spec from 'pactum/src/models/Spec';
import { GameConfigService } from '../src/game-config/game-config.service';
import { PrismaService } from '../src/prisma/prisma.service';

export const businesses = (spec: () => Spec, app: () => INestApplication) => {
  describe('Businesses', () => {
    it('should get business', () =>
      spec()
        .get('/business/get-business')
        .withQueryParams({ businessId: '1' })
        .expectStatus(200));

    it('should collect money', () =>
      spec()
        .post('/business/collect-money/')
        .withBody({ businessId: 1 })
        .expectStatus(201));

    it('should not upgrade business without item', () =>
      spec()
        .post('/business/upgrade-business')
        .withBody({ businessId: 1 })
        .expectStatus(403));

    it('should upgrade business', async () => {
      const config = app().get(GameConfigService);
      const prisma = app().get(PrismaService);

      for (const item of config.config.items.map(({ name }) => name)) {
        await prisma.inventoryItem.create({
          data: { name: item, count: 100000, building: { connect: { id: 2 } } },
        });
      }

      return spec()
        .post('/business/upgrade-business')
        .withBody({ businessId: 1 })
        .expectStatus(201);
    });
  });
};
