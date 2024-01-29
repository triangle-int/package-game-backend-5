import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { FirebaseAuthStrategy } from '@tfarras/nestjs-firebase-auth';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(
  FirebaseAuthStrategy,
  'firebase',
) {
  constructor() {
    super({
      extractor: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }
}
