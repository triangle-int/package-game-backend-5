import { INestApplication } from '@nestjs/common';
import Spec from 'pactum/src/models/Spec';
import { PrismaService } from '../src/prisma/prisma.service';

export const trades = (spec: () => Spec, app: () => INestApplication) => {
  describe('Trades', () => {
    it('should get trades', () =>
      spec()
        .post('/trade/get-trades')
        .withBody({ page: 0, resources: [], nickname: '' })
        .expectStatus(201));

    it('should get my trades', () =>
      spec().get('/trade/my-trades').expectStatus(200));

    it('should set trade price', async () => {
      const prisma = app().get(PrismaService);

      await prisma.trade.create({
        data: {
          name: 'wheel',
          count: 100,
          pricePerUnit: 0,
          owner: { connect: { id: 1 } },
        },
      });

      return spec()
        .post('/trade/set-price')
        .withBody({ tradeId: 1, price: 10 })
        .expectStatus(201);
    });

    it('should buy trade', async () => {
      const prisma = app().get(PrismaService);

      await prisma.trade.create({
        data: {
          name: 'wheel',
          count: 100,
          pricePerUnit: 1,
          owner: {
            create: {
              nickname: 'user1',
              avatar: 'user',
              geohash: '',
              money: 0,
              gems: 0,
              level: 0,
              experience: 0,
              firebaseId: '',
            },
          },
        },
      });

      return spec()
        .post('/trade/buy-trade')
        .withBody({ tradeId: 2, resourcesCount: 100 })
        .expectStatus(201);
    });
  });
};
