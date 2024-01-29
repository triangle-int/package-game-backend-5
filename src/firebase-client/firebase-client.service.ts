import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp } from 'firebase/app';
import {
  UserCredential,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';

@Injectable()
export class FirebaseClientService {
  private user: UserCredential;

  constructor(private readonly config: ConfigService) {
    this.initUser();
  }

  private async initUser() {
    const clientConfigString = this.config.get('FIREBASE_CLIENT_CONFIG');

    if (clientConfigString == null) {
      return;
    }

    const clientConfig = JSON.parse(clientConfigString);
    const app = initializeApp(clientConfig);
    const auth = getAuth(app);

    this.user = await signInWithEmailAndPassword(
      auth,
      this.config.get('TEST_ACCOUNT_EMAIL'),
      this.config.get('TEST_ACCOUNT_PASSWORD'),
    );
  }

  public async getTestToken() {
    return await this.user?.user.getIdToken();
  }
}
