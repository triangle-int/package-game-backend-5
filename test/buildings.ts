import Spec from 'pactum/src/models/Spec';

export const buildings = (spec: () => Spec) => {
  describe('Buildings', () => {
    describe('Creating stuff', () => {
      it('should create business', () =>
        spec()
          .post('/building/create-business')
          .withBody({ location: '0,0' })
          .expectStatus(201));

      it('should create storage', () =>
        spec()
          .post('/building/create-storage')
          .withBody({ location: '0,0.01' })
          .expectStatus(201));

      it('should create factory', () =>
        spec()
          .post('/building/create-factory')
          .withBody({ location: '0.01,0.01' })
          .expectStatus(201));

      it('should not create satellite', () =>
        spec()
          .post('/building/create-satellite')
          .withBody({ location: '0.01,0', level: 1 })
          .expectStatus(403));

      for (let index = 0; index < 10; index++) {
        it('should create business', () =>
          spec()
            .post('/building/create-business')
            .withBody({ location: `0,${index + 1}` })
            .expectStatus(201));
      }

      it('should create satellite', () =>
        spec()
          .post('/building/create-satellite')
          .withBody({ location: '0.01,0', level: 1 })
          .expectStatus(201));

      it('should not create buildng at the same spot', () =>
        spec()
          .post('/building/create-business')
          .withBody({ location: '0,0' })
          .expectStatus(403));
    });

    describe('Getting buildings', () => {
      it('should get all buildings', () =>
        spec()
          .get('/building/get-all')
          .expectStatus(200)
          .expectJsonLike({ buildings: [{}, {}, {}, {}] }));

      it('should get buildings in bounds', () =>
        spec()
          .get('/building/get')
          .withQueryParams({ minCoords: '0,0', maxCoords: '0,0' })
          .expectStatus(200)
          .expectJsonLike({ buildings: [{}] }));

      it('should get storage', () =>
        spec()
          .get('/building/get-storage')
          .withQueryParams({ buildingId: 2 })
          .expectStatus(200));
    });

    describe('Removing buildings', () => {
      it('should create building', () =>
        spec()
          .post('/building/create-business')
          .withBody({ location: '0.02,0.02' })
          .expectStatus(201));

      it('should remove building', () =>
        spec()
          .post('/building/remove-building')
          .withBody({ buildingId: 11 })
          .expectStatus(201));
    });
  });
};
