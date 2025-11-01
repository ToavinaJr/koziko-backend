// import {
//   WebSocketGateway,
//   WebSocketServer,
//   SubscribeMessage,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   MessageBody,
//   ConnectedSocket,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { Injectable, Logger } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';

// @WebSocketGateway({
//   cors: { origin: '*' },
//   namespace: '/webrtc',
// })
// @Injectable()
// export class WebrtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer()
//   server: Server;

//   private readonly logger = new Logger(WebrtcGateway.name);
//   // map socketId -> userId
//   private socketUser = new Map<string, string>();

//   constructor(private readonly jwtService: JwtService) {}

//   handleConnection(client: Socket) {
//     try {
//       const token = client.handshake.auth?.token;
//       if (!token) throw new Error('No token');
//       const payload: any = this.jwtService.verify(token);
//       const userId = payload.sub || payload.id;
//       if (!userId) throw new Error('Invalid token payload');

//       const roomName = `user_${userId}`;
//       client.join(roomName);
//       this.socketUser.set(client.id, userId);

//       this.logger.log(`WebRTC client connected: ${client.id} -> user ${userId}`);
//       client.emit('connected', { userId });
//     } catch (err) {
//       this.logger.warn('WebRTC socket auth failed: ' + err?.message);
//       client.emit('error', { message: 'Auth failed' });
//       client.disconnect();
//     }
//   }

//   handleDisconnect(client: Socket) {
//     const userId = this.socketUser.get(client.id);
//     if (userId) {
//       this.socketUser.delete(client.id);
//       this.logger.log(`WebRTC client disconnected: ${client.id} (user ${userId})`);
//     }
//   }

//   // Caller requests to start a call with target user
//   @SubscribeMessage('call:request')
//   handleCallRequest(@MessageBody() body: { to: string }, @ConnectedSocket() client: Socket) {
//     const from = this.socketUser.get(client.id);
//     if (!from) return;
//     const toRoom = `user_${body.to}`;
//     this.logger.log(`call:request from ${from} to ${body.to}`);
//     this.server.to(toRoom).emit('call:incoming', { from });
//   }

//   @SubscribeMessage('call:offer')
//   handleOffer(@MessageBody() body: { to: string; offer: any }, @ConnectedSocket() client: Socket) {
//     const from = this.socketUser.get(client.id);
//     if (!from) return;
//     const toRoom = `user_${body.to}`;
//     this.logger.log(`call:offer from ${from} to ${body.to}`);
//     this.server.to(toRoom).emit('call:offer', { from, offer: body.offer });
//   }

//   @SubscribeMessage('call:answer')
//   handleAnswer(@MessageBody() body: { to: string; answer: any }, @ConnectedSocket() client: Socket) {
//     const from = this.socketUser.get(client.id);
//     if (!from) return;
//     const toRoom = `user_${body.to}`;
//     this.logger.log(`call:answer from ${from} to ${body.to}`);
//     this.server.to(toRoom).emit('call:answer', { from, answer: body.answer });
//   }

//   @SubscribeMessage('call:ice-candidate')
//   handleIce(@MessageBody() body: { to: string; candidate: any }, @ConnectedSocket() client: Socket) {
//     const from = this.socketUser.get(client.id);
//     if (!from) return;
//     const toRoom = `user_${body.to}`;
//     this.logger.log(`call:ice-candidate from ${from} to ${body.to}`);
//     this.server.to(toRoom).emit('call:ice-candidate', { from, candidate: body.candidate });
//   }

//   @SubscribeMessage('call:end')
//   handleEnd(@MessageBody() body: { to: string }, @ConnectedSocket() client: Socket) {
//     const from = this.socketUser.get(client.id);
//     if (!from) return;
//     const toRoom = `user_${body.to}`;
//     this.logger.log(`call:end from ${from} to ${body.to}`);
//     this.server.to(toRoom).emit('call:end', { from });
//   }
// }
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
  // map userId -> socketId (pour pouvoir trouver le socket d'un user)
  private userSocket = new Map<string, string>();
  // map userId -> callState (pour tracker les appels en cours)
  private activeCalls = new Map<string, { with: string; status: 'calling' | 'connected' }>();

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
      this.userSocket.set(userId, client.id);
      
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
      // Si l'utilisateur était en appel, notifier l'autre partie
      const callState = this.activeCalls.get(userId);
      if (callState) {
        const otherUserId = callState.with;
        this.server.to(`user_${otherUserId}`).emit('call:end', { from: userId });
        this.activeCalls.delete(userId);
        this.activeCalls.delete(otherUserId);
      }

      this.socketUser.delete(client.id);
      this.userSocket.delete(userId);
      this.logger.log(`WebRTC client disconnected: ${client.id} (user ${userId})`);
    }
  }

  // Caller requests to start a call with target user
  @SubscribeMessage('call:request')
  handleCallRequest(@MessageBody() body: { to: string }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;

    // Vérifier si le destinataire est en ligne
    const targetSocketId = this.userSocket.get(body.to);
    if (!targetSocketId) {
      client.emit('call:error', { message: 'User is offline' });
      return;
    }

    // Vérifier si le destinataire est déjà en appel
    if (this.activeCalls.has(body.to)) {
      client.emit('call:error', { message: 'User is busy' });
      return;
    }

    const toRoom = `user_${body.to}`;
    this.logger.log(`call:request from ${from} to ${body.to}`);
    
    // Marquer l'appel comme en cours
    this.activeCalls.set(from, { with: body.to, status: 'calling' });
    this.activeCalls.set(body.to, { with: from, status: 'calling' });
    
    this.server.to(toRoom).emit('call:incoming', { from });
  }

  @SubscribeMessage('call:offer')
  handleOffer(@MessageBody() body: { to: string; offer: any }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) {
      this.logger.warn(`call:offer from unknown socket: ${client.id}`);
      return;
    }
    
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:offer from ${from} to ${body.to}`, {
      offerType: body.offer?.type,
      offerSdp: body.offer?.sdp?.substring(0, 100) + '...',
      targetRoom: toRoom
    });
    
    this.server.to(toRoom).emit('call:offer', { from, offer: body.offer });
    this.logger.log(`✅ call:offer sent to room ${toRoom}`);
  }

  @SubscribeMessage('call:answer')
  handleAnswer(@MessageBody() body: { to: string; answer: any }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) {
      this.logger.warn(`call:answer from unknown socket: ${client.id}`);
      return;
    }
    
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:answer from ${from} to ${body.to}`, {
      answerType: body.answer?.type,
      answerSdp: body.answer?.sdp?.substring(0, 100) + '...',
      targetRoom: toRoom
    });
    
    // Mettre à jour le statut de l'appel
    if (this.activeCalls.has(from)) {
      this.activeCalls.get(from)!.status = 'connected';
    }
    if (this.activeCalls.has(body.to)) {
      this.activeCalls.get(body.to)!.status = 'connected';
    }
    
    this.server.to(toRoom).emit('call:answer', { from, answer: body.answer });
    this.logger.log(`✅ call:answer sent to room ${toRoom}`);
  }

  @SubscribeMessage('call:ice-candidate')
  handleIce(@MessageBody() body: { to: string; candidate: any }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) {
      this.logger.warn(`call:ice-candidate from unknown socket: ${client.id}`);
      return;
    }
    
    const toRoom = `user_${body.to}`;
    this.logger.debug(`call:ice-candidate from ${from} to ${body.to}`, {
      candidate: body.candidate?.candidate?.substring(0, 50) + '...',
      targetRoom: toRoom
    });
    
    this.server.to(toRoom).emit('call:ice-candidate', { from, candidate: body.candidate });
  }

  @SubscribeMessage('call:reject')
  handleReject(@MessageBody() body: { to: string }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;
    
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:reject from ${from} to ${body.to}`);
    
    // Nettoyer l'état de l'appel
    this.activeCalls.delete(from);
    this.activeCalls.delete(body.to);
    
    this.server.to(toRoom).emit('call:rejected', { from });
  }

  @SubscribeMessage('call:end')
  handleEnd(@MessageBody() body: { to: string }, @ConnectedSocket() client: Socket) {
    const from = this.socketUser.get(client.id);
    if (!from) return;
    
    const toRoom = `user_${body.to}`;
    this.logger.log(`call:end from ${from} to ${body.to}`);
    
    // Nettoyer l'état de l'appel
    this.activeCalls.delete(from);
    this.activeCalls.delete(body.to);
    
    this.server.to(toRoom).emit('call:end', { from });
  }

  // Méthode utilitaire pour obtenir les appels actifs (pour le debug)
  @SubscribeMessage('call:status')
  handleStatus(@ConnectedSocket() client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;
    
    const callState = this.activeCalls.get(userId);
    client.emit('call:status', { 
      inCall: !!callState,
      callState 
    });
  }
}