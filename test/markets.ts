import { INestApplication } from '@nestjs/common';
import Spec from 'pactum/src/models/Spec';
import { PrismaService } from '../src/prisma/prisma.service';

export const markets = (spec: () => Spec, app: () => INestApplication) => {
  describe('Markets', () => {
    it('returns a generated market', async () => {
      const market = await app()
        .get(PrismaService)
        .building.findFirst({ where: { discriminator: 'market' } });
      expect(market).not.toBeNull();

      return spec()
        .get('/market/get-market')
        .withQueryParams({ marketId: market.id })
        .expectStatus(200);
    });

    it('rejects an unknown market', () =>
      spec()
        .get('/market/get-market')
        .withQueryParams({ marketId: 999999 })
        .expectStatus(403)
        .expectJsonLike({ message: 'marketNotFound' }));
  });
};
