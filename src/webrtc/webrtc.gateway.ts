import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/webrtc',
})
@Injectable()
export class WebrtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebrtcGateway.name);
  // map socketId -> userId
  private socketUser = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new Error('No token');
      const payload: any = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      if (!userId) throw new Error('Invalid token payload');

      const roomName = `user_${userId}`;
      client.join(roomName);
      this.socketUser.set(client.id, userId);

      this.logger.log(`WebRTC client connected: ${client.id} -> user ${userId}`);
      client.emit('connected', { userId });
    } catch (err) {
      this.logger.warn('WebRTC socket auth failed: ' + err?.message);
      client.emit('error', { message: 'Auth failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (userId) {
      this.socketUser.delete(client.id);
      this.logger.log(`WebRTC client disconnected: ${client.id} (user ${userId})`);
    }
  }

  // Caller requests to start a call with target user
  @SubscribeMessage('call:request')
  handleCallRequest(@MessageBody() body: { to: string }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:request from ${from} to ${body.to}`);
    this.server.to(toRoom).emit('call:incoming', { from });
  }

  @SubscribeMessage('call:offer')
  handleOffer(@MessageBody() body: { to: string; offer: any }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:offer from ${from} to ${body.to}`);
    this.server.to(toRoom).emit('call:offer', { from, offer: body.offer });
  }

  @SubscribeMessage('call:answer')
  handleAnswer(@MessageBody() body: { to: string; answer: any }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:answer from ${from} to ${body.to}`);
    this.server.to(toRoom).emit('call:answer', { from, answer: body.answer });
  }

  @SubscribeMessage('call:ice-candidate')
  handleIce(@MessageBody() body: { to: string; candidate: any }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:ice-candidate from ${from} to ${body.to}`);
    this.server.to(toRoom).emit('call:ice-candidate', { from, candidate: body.candidate });
  }

  @SubscribeMessage('call:end')
  handleEnd(@MessageBody() body: { to: string }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:end from ${from} to ${body.to}`);
    this.server.to(toRoom).emit('call:end', { from });
  }
}
