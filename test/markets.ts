import Spec from 'pactum/src/models/Spec';

export const markets = (spec: () => Spec) => {
  describe('Markets', () => {
    it('should get market', () =>
      spec()
        .get('/market/get-market')
        .withQueryParams({ marketId: 7 })
        .expectStatus(200));
  });
};
