import Spec from 'pactum/src/models/Spec';

export const users = (spec: () => Spec) => {
  describe('Users', () => {
    describe('Get test tokens', () => {
      it('should get firebase token', () =>
        spec()
          .get('/user/get-test-token')
          .expectStatus(200)
          .stores('userToken', 'token'));

      it('should generate beta token', () =>
        spec()
          .post('/user/generate-beta-token')
          .expectStatus(201)
          .stores('betaToken', 'token'));
    });

    describe('Create user', () => {
      it('should create user', () =>
        spec()
          .post('/user/create')
          .withBody({
            nickname: 'user',
            avatar: '😀',
            location: '0,0',
            betaAccessToken: '$S{betaToken}',
          })
          .expectStatus(201)
          .expectJsonLike({ nickname: 'user', avatar: '😀' }));

      it('should get user', () =>
        spec()
          .get('/user/me')
          .expectStatus(200)
          .expectJsonLike({ nickname: 'user', avatar: '😀' }));

      it('should not create user with same nickanme', () =>
        spec()
          .post('/user/create')
          .withBody({
            nickname: 'user',
            avatar: '😀',
            location: '0,0',
            betaAccessToken: '$S{betaToken}',
          })
          .expectStatus(403));
    });

    describe('Update user', () => {
      it('should set fcm token', () =>
        spec()
          .post('/user/set-fcm-token')
          .withBody({ fcmToken: 'token' })
          .expectStatus(201));

      it('should set tutorial', () =>
        spec()
          .post('/user/set-tutorial')
          .withBody({ tutorial: 'tutorial' })
          .expectStatus(201));

      it('should get tutorial', () =>
        spec()
          .get('/user/get-tutorial')
          .expectStatus(200)
          .expectBody('tutorial'));

      it('should set location', () =>
        spec()
          .post('/user/set-location')
          .withBody({ location: '51.48,0' })
          .expectStatus(201));

      it('should get proper location', () =>
        spec().get('/user/me').expectStatus(200).expectJsonLike({
          geohash: 'gcpuzgxux',
        }));
    });

    describe('Get users', () => {
      it('should get users in bounds', () =>
        spec()
          .get('/user/get-users-in-bounds')
          .withQueryParams({ minCoords: '0,0', maxCoords: '0,0' })
          .expectStatus(200)
          .expectBody([]));
    });
  });
};
