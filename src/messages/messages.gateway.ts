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
import { MessagesService } from './messages.service';
import type { Message } from './entities/message.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
  namespace: '/messages',
})
@Injectable()
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Handle client connection with JWT authentication
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      client.userId = userId;

      // Store socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId)!.push(client.id);

      // Join user's personal room
      client.join(`user_${userId}`);

      this.logger.log(`User ${userId} connected with socket ${client.id}`);
      
      // Notify client of successful connection
      client.emit('connected', { userId });

    } catch (err) {
      this.logger.error(`Socket auth failed for ${client.id}:`, err.message);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        const index = sockets.indexOf(client.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Handle new message from client
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { receiverId, groupId, content, type, fileUrl, fileName, fileSize } = data;
      const senderId = client.userId;

      if (!senderId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Create message in database
      const message = await this.messagesService.create({
        senderId,
        receiverId,
        groupId,
        content,
        type,
        fileUrl,
        fileName,
        fileSize,
      });

      // Emit to sender (confirmation)
      client.emit('messageSent', message);

      // Emit to receiver(s)
      if (receiverId) {
        // Direct message
        this.server.to(`user_${receiverId}`).emit('newMessage', message);
        this.logger.log(`Message sent from ${senderId} to ${receiverId}`);
      } else if (groupId) {
        // Group message - emit to all group members
        this.server.to(`group_${groupId}`).emit('newMessage', message);
        this.logger.log(`Message sent to group ${groupId} by ${senderId}`);
      }

      return message;
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle message editing
   */
  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { messageId, content } = data;
      const userId = client.userId;

      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const message = await this.messagesService.findOne(messageId);
      
      if (message.senderId !== userId) {
        client.emit('error', { message: 'Cannot edit other users messages' });
        return;
      }

      const updatedMessage = await this.messagesService.update(messageId, { content });

      // Emit to both sender and receiver
      client.emit('messageEdited', updatedMessage);
      
      if (updatedMessage.receiverId) {
        this.server.to(`user_${updatedMessage.receiverId}`).emit('messageEdited', updatedMessage);
      } else if (updatedMessage.groupId) {
        this.server.to(`group_${updatedMessage.groupId}`).emit('messageEdited', updatedMessage);
      }

      return updatedMessage;
    } catch (error) {
      this.logger.error('Error editing message:', error);
      client.emit('error', { message: 'Failed to edit message' });
    }
  }

  /**
   * Handle message deletion
   */
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() messageId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = client.userId;

      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const message = await this.messagesService.findOne(messageId);
      
      if (message.senderId !== userId) {
        client.emit('error', { message: 'Cannot delete other users messages' });
        return;
      }

      const receiverId = message.receiverId;
      const groupId = message.groupId;

      await this.messagesService.remove(messageId);

      // Emit to both sender and receiver
      client.emit('messageDeleted', { messageId });
      
      if (receiverId) {
        this.server.to(`user_${receiverId}`).emit('messageDeleted', { messageId });
      } else if (groupId) {
        this.server.to(`group_${groupId}`).emit('messageDeleted', { messageId });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting message:', error);
      client.emit('error', { message: 'Failed to delete message' });
    }
  }

  /**
   * Handle marking messages as read
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId?: string; senderId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = client.userId;

      if (!userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      await this.messagesService.markAsRead(userId, data);

      // Notify the sender that their messages were read
      if (data.senderId) {
        this.server.to(`user_${data.senderId}`).emit('messagesRead', {
          readBy: userId,
          conversationId: data.conversationId,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking as read:', error);
      client.emit('error', { message: 'Failed to mark as read' });
    }
  }

  /**
   * Handle user typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { receiverId?: string; groupId?: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;
    if (!userId) return;

    if (data.receiverId) {
      this.server.to(`user_${data.receiverId}`).emit('userTyping', {
        userId,
        isTyping: data.isTyping,
      });
    } else if (data.groupId) {
      this.server.to(`group_${data.groupId}`).emit('userTyping', {
        userId,
        isTyping: data.isTyping,
      });
    }
  }

  /**
   * Join a group room for group messaging
   */
  @SubscribeMessage('joinGroup')
  handleJoinGroup(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.join(`group_${groupId}`);
    this.logger.log(`User ${client.userId} joined group ${groupId}`);
    return { success: true };
  }

  /**
   * Leave a group room
   */
  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(`group_${groupId}`);
    this.logger.log(`User ${client.userId} left group ${groupId}`);
    return { success: true };
  }

  /**
   * Public method to notify new message (can be called from service)
   */
  notifyNewMessage(message: Message) {
    if (message.receiverId) {
      this.server.to(`user_${message.receiverId}`).emit('newMessage', message);
    } else if (message.groupId) {
      this.server.to(`group_${message.groupId}`).emit('newMessage', message);
    }
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
