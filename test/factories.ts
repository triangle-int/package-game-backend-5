import Spec from 'pactum/src/models/Spec';

export const factories = (spec: () => Spec) => {
  describe('Factories', () => {
    it('should get factory', () =>
      spec()
        .get('/factory/get-factory')
        .withQueryParams({ factoryId: '3' })
        .expectStatus(200));

    it('should set factory resource', () =>
      spec()
        .post('/factory/set-factory-resource')
        .withBody({ factoryId: 3, resource: 'wheel' })
        .expectStatus(201));

    it('should toggle off factory', () =>
      spec()
        .post('/factory/toggle-factory')
        .withBody({ factoryId: 3, state: false })
        .expectStatus(201)
        .expectJsonLike({ enabled: false }));

    it('should toggle on factory', () =>
      spec()
        .post('/factory/toggle-factory')
        .withBody({ factoryId: 3, state: true })
        .expectStatus(201)
        .expectJsonLike({ enabled: true }));

    it('should upgrade factory', () =>
      spec()
        .post('/factory/upgrade-factory')
        .withBody({ factoryId: '3' })
        .expectStatus(201)
        .expectJsonLike({ level: 2 }));
  });
};
