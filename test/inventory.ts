import Spec from 'pactum/src/models/Spec';

export const inventory = (spec: () => Spec) => {
  describe('Inventory', () => {
    it('should fetch inventory', () =>
      spec().get('/inventory/fetch').expectStatus(200));
  });
};
