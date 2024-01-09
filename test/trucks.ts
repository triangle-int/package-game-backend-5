import { INestApplication } from '@nestjs/common';
import Spec from 'pactum/src/models/Spec';
import { PrismaService } from '../src/prisma/prisma.service';

export const trucks = (spec: () => Spec, app: () => INestApplication) => {
  describe('Trucks', () => {
    it('should calculate path cost', () =>
      spec()
        .post('/truck/calculate-path-cost')
        .withBody({ aId: 2, bId: 4, truckType: 2, resourceCount: 100 })
        .expectStatus(201));

    it('should create truck', async () => {
      const prisma = app().get(PrismaService);
      await prisma.user.update({ where: { id: 1 }, data: { money: 1000000 } });

      return spec()
        .post('/truck/create-truck')
        .withBody({
          aId: 2,
          bId: 4,
          truckType: 2,
          resourceCount: 100,
          resourceName: 'wheel',
          createSchedule: false,
          interval: 1,
        })
        .expectStatus(201);
    });

    it('should create schedule', () =>
      spec()
        .post('/truck/create-truck')
        .withBody({
          aId: 2,
          bId: 4,
          truckType: 2,
          resourceCount: 100,
          resourceName: 'wheel',
          createSchedule: true,
          interval: 1,
        })
        .expectStatus(201));

    it('should get targets', () =>
      spec().get('/truck/get-delivery-targets').expectStatus(200));

    it('should get schedules', () =>
      spec().get('/truck/get-schedules').expectStatus(200));

    it('should remove truck schedule', () =>
      spec()
        .post('/truck/remove-truck-schedule')
        .withBody({ scheduleId: 1 })
        .expectStatus(201));
  });
};
