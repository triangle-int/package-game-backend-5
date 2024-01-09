import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  FirebaseAuthStrategy,
  FirebaseUser,
} from '@tfarras/nestjs-firebase-auth';
import { ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

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

  async validate(payload: FirebaseUser): Promise<FirebaseUser> {
    // console.log({ payload: payload });

    return payload;
  }
}
