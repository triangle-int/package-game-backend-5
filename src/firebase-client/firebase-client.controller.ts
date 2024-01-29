import { Controller, Get } from '@nestjs/common';
import { FirebaseClientService } from './firebase-client.service';

@Controller()
export class FirebaseClientController {
  constructor(private readonly firebaseClient: FirebaseClientService) {}

  @Get('firebase-test-token')
  async getTestToken() {
    return await this.firebaseClient.getTestToken();
  }
}
