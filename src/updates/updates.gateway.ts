import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import { Auth } from 'firebase-admin/lib/auth/auth';
import { bigintToString } from '../helpers/interceptor/big-int.interceptor';

@Injectable()
export class UpdatesGateway implements OnModuleInit {
  private wss: WebSocketServer;
  private auth: Auth;
  private sockets: Map<any, string> = new Map(); // socket -> firebaseId

  constructor(@InjectFirebaseAdmin() firebaseAdmin: FirebaseAdmin) {
    this.auth = firebaseAdmin.auth;
  }

  onModuleInit() {
    this.wss = new WebSocketServer({ port: 3001 });

    this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
      // Получаем токен из query параметров
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      try {
        const uid = (await this.auth.verifyIdToken(token)).uid;
        this.sockets.set(ws, uid);

        ws.on('close', () => {
          this.sockets.delete(ws);
        });

        // Подтверждаем подключение
        ws.send(JSON.stringify({ type: 'connected', uid }));
      } catch (e) {
        ws.close(1008, 'Unauthorized');
      }
    });
  }

  isOnline(uid: string): boolean {
    return Array.from(this.sockets.values()).includes(uid);
  }

  sendData(channel: string, uid: string, data: any) {
    const payload = JSON.stringify({
      channel,
      data: bigintToString(data),
    });

    for (const [socket, firebaseId] of this.sockets.entries()) {
      if (firebaseId === uid && socket.readyState === 1) {
        // OPEN
        socket.send(payload);
      }
    }
  }
}
