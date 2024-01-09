import Spec from 'pactum/src/models/Spec';

export const satellites = (spec: () => Spec) => {
  describe('Satellites', () => {
    it('should collect money', () =>
      spec()
        .post('/satellite/collect-money')
        .withBody({ satelliteId: 19 })
        .expectStatus(201));
  });
};
