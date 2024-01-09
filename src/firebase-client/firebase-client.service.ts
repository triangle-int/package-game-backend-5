import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import firebaseConfig from './firebase-client-config.json';

@Injectable()
export class FirebaseClientService {
  private app: FirebaseApp;
  private user: UserCredential;

  constructor(private config: ConfigService) {
    this.app = initializeApp(firebaseConfig);
  }

  async getIdToken() {
    if (!this.user) {
      this.user = await signInWithEmailAndPassword(
        getAuth(this.app),
        this.config.get('TEST_ACCOUNT_EMAIL'),
        this.config.get('TEST_ACCOUNT_PASSWORD'),
      );
    }

    return await this.user.user.getIdToken();
  }
}
