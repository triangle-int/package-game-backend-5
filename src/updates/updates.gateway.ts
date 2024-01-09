import { Injectable } from '@nestjs/common';
import { WebSocketGateway, OnGatewayConnection } from '@nestjs/websockets';
import { OnGatewayDisconnect } from '@nestjs/websockets/interfaces';
import { Auth } from 'firebase-admin/lib/auth/auth';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import { bigintToString } from '../helpers/interceptor/big-int.interceptor';

@Injectable()
@WebSocketGateway()
export class UpdatesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private auth: Auth;
  private sockets: { socket: any; firebaseId: string }[] = [];

  constructor(@InjectFirebaseAdmin() firebaseAdmin: FirebaseAdmin) {
    this.auth = firebaseAdmin.auth;
  }

  async handleConnection(client: any) {
    try {
      const token = client.handshake.auth.token;
      const uid = (await this.auth.verifyIdToken(token)).uid;
      this.sockets.push({ socket: client, firebaseId: uid });
    } catch (e) {}
  }

  async handleDisconnect(client: any) {
    const index = this.sockets.findIndex(
      ({ socket }) => socket.id === client.id,
    );

    if (index > -1) this.sockets.splice(index, 1);
  }

  isOnline(uid: string) {
    return this.sockets.some(({ firebaseId }) => firebaseId == uid);
  }

  sendData(channel: string, uid: string, data: any) {
    const sockets = this.sockets
      .filter(({ firebaseId }) => firebaseId == uid)
      .map(({ socket }) => socket);

    for (const socket of sockets) {
      socket.emit(channel, JSON.stringify(bigintToString(data)));
    }
  }
}
