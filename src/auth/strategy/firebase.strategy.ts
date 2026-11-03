import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  FirebaseAuthStrategy,
  FirebaseUser,
} from '@tfarras/nestjs-firebase-auth';
import { ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as admin from 'firebase-admin';
import { getDevUserId, isDevLoginAllowed } from '../dev-login';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(
  FirebaseAuthStrategy,
  'firebase',
) {
  constructor(private prisma: PrismaService) {
    super({
      extractor: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  authenticate(req: any) {
    const idToken = (this as any).extractor(req);
    if (!idToken) {
      this.fail('UNAUTHORIZED', 401);
      return;
    }

    if (idToken?.startsWith('dev_token') && !isDevLoginAllowed(idToken)) {
      this.fail('UNAUTHORIZED', 401);
      return;
    }

    if (isDevLoginAllowed(idToken)) {
      const mockUser: any = {
        uid: getDevUserId(idToken),
        email: 'dev@package.local',
        email_verified: true,
      };
      this.success(mockUser);
      return;
    }

    try {
      admin
        .auth()
        .verifyIdToken(idToken, false)
        .then((res) => (this as any).validateDecodedIdToken(res))
        .catch((err) => {
          this.fail({ err }, 401);
        });
    } catch (e) {
      this.fail(e, 401);
    }
  }

  async validate(payload: FirebaseUser): Promise<FirebaseUser> {
    // console.log({ payload: payload });

    return payload;
  }
}
