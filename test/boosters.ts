import Spec from 'pactum/src/models/Spec';

export const boosters = (spec: () => Spec) => {
  describe('Boosters', () => {
    it('should buy booster', () =>
      spec()
        .post('/booster/buy-booster')
        .withBody({ boosterType: 'deliverySpeedBooster' })
        .expectStatus(201));

    it('should activate booster', () =>
      spec()
        .post('/booster/activate-booster')
        .withBody({ boosterType: 'deliverySpeedBooster' })
        .expectStatus(201));

    it('should get boosters', () =>
      spec().get('/booster/get-boosters').expectStatus(200));
  });
};
