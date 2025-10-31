import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto, MarkAsReadDto } from './dto/update-message.dto';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Generate a unique conversation ID for direct messages
   * Always sorts user IDs to ensure consistency
   */
  private generateConversationId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Clean user data to remove sensitive information
   */
  private cleanUserData(user: User): any {
    if (!user) return null;
    const { password, ...cleanUser } = user as any;
    return cleanUser;
  }

  /**
   * Create a new message (direct or group)
   */
  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const { senderId, receiverId, groupId, content, fileUrl } = createMessageDto;

    // Validate that either receiverId or groupId is provided
    if (!receiverId && !groupId) {
      throw new BadRequestException('Either receiverId or groupId must be provided');
    }

    // Validate that both are not provided
    if (receiverId && groupId) {
      throw new BadRequestException('Cannot send message to both user and group');
    }

    // Validate content or file
    if (!content && !fileUrl) {
      throw new BadRequestException('Message must have content or file');
    }

    // Verify sender exists
    const sender = await this.usersRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // For direct messages, verify receiver and generate conversation ID
    if (receiverId) {
      const receiver = await this.usersRepository.findOne({ where: { id: receiverId } });
      if (!receiver) {
        throw new NotFoundException('Receiver not found');
      }
      createMessageDto.conversationId = this.generateConversationId(senderId, receiverId);
    }

    const message = this.messagesRepository.create(createMessageDto);
    return this.messagesRepository.save(message);
  }

  /**
   * Get all messages (admin only - for debugging)
   */
  async findAll(): Promise<Message[]> {
    return this.messagesRepository.find({
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single message by ID
   */
  async findOne(id: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  /**
   * Update a message (edit content)
   */
  async update(id: string, updateMessageDto: UpdateMessageDto): Promise<Message> {
    const message = await this.findOne(id);
    
    // Only allow updating content and file-related fields
    if (updateMessageDto.content !== undefined) {
      message.content = updateMessageDto.content;
      message.isEdited = true;
    }
    
    if (updateMessageDto.fileUrl !== undefined) {
      message.fileUrl = updateMessageDto.fileUrl;
    }
    
    if (updateMessageDto.fileName !== undefined) {
      message.fileName = updateMessageDto.fileName;
    }
    
    if (updateMessageDto.fileSize !== undefined) {
      message.fileSize = updateMessageDto.fileSize;
    }
    
    return this.messagesRepository.save(message);
  }

  /**
   * Delete a message
   */
  async remove(id: string): Promise<void> {
    const message = await this.findOne(id);
    await this.messagesRepository.remove(message);
  }

  /**
   * Get all conversations for a user (direct messages only)
   */
  async getDirectConversations(userId: string): Promise<any[]> {
    console.log('🔍 [Backend] Getting direct conversations for user:', userId);
    
    // Get all messages where user is sender or receiver
    const messages = await this.messagesRepository.find({
      where: [
        { senderId: userId },
        { receiverId: userId }
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });

    console.log('📨 [Backend] Found', messages.length, 'messages');

    if (messages.length === 0) {
      return [];
    }

    // Group messages by conversationId
    const conversationsMap = new Map<string, any>();

    messages.forEach(message => {
      if (!message.conversationId) return;

      if (!conversationsMap.has(message.conversationId)) {
        // Determine the other participant
        const otherParticipant = message.senderId === userId ? message.receiver : message.sender;
        
        console.log('👥 [Backend] Other participant for conversation', message.conversationId, ':', otherParticipant);
        
        conversationsMap.set(message.conversationId, {
          id: message.conversationId,
          participant: this.cleanUserData(otherParticipant),
          lastMessage: {
            ...message,
            sender: this.cleanUserData(message.sender),
            receiver: this.cleanUserData(message.receiver),
          },
          unreadCount: 0,
          updatedAt: message.updatedAt,
        });
      }

      // Count unread messages
      const conversation = conversationsMap.get(message.conversationId);
      if (!message.isRead && message.receiverId === userId) {
        conversation.unreadCount++;
      }
    });

    // Convert map to array and sort by last message date
    const conversations = Array.from(conversationsMap.values());
    conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    console.log('✅ [Backend] Returning', conversations.length, 'conversations');
    console.log('📋 [Backend] Conversations sample:', JSON.stringify(conversations[0], null, 2));

    return conversations;
  }

  /**
   * Get all messages for a direct conversation
   */
  async getConversationMessages(userId: string, otherUserId: string): Promise<Message[]> {
    const conversationId = this.generateConversationId(userId, otherUserId);
    
    const messages = await this.messagesRepository.find({
      where: { conversationId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
    });

    return messages;
  }

  /**
   * Delete a conversation (all messages between two users)
   */
  async deleteConversation(userId: string, otherUserId: string): Promise<void> {
    const conversationId = this.generateConversationId(userId, otherUserId);
    
    const messages = await this.messagesRepository.find({
      where: { conversationId },
    });

    if (messages.length > 0) {
      await this.messagesRepository.remove(messages);
    }
  }

  /**
   * Get all messages for a group
   */
  async getGroupMessages(groupId: string): Promise<Message[]> {
    const messages = await this.messagesRepository.find({
      where: { groupId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return messages;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId: string, markAsReadDto: MarkAsReadDto): Promise<void> {
    const { conversationId, senderId } = markAsReadDto;

    let messages: Message[];

    if (conversationId) {
      // Mark all unread messages in a conversation as read
      messages = await this.messagesRepository.find({
        where: {
          conversationId,
          receiverId: userId,
          isRead: false,
        },
      });
    } else if (senderId) {
      // Mark all unread messages from a specific sender as read
      const conversationId = this.generateConversationId(userId, senderId);
      messages = await this.messagesRepository.find({
        where: {
          conversationId,
          receiverId: userId,
          isRead: false,
        },
      });
    } else {
      throw new BadRequestException('Either conversationId or senderId must be provided');
    }

    if (messages.length > 0) {
      messages.forEach(message => {
        message.isRead = true;
        message.readAt = new Date();
      });
      await this.messagesRepository.save(messages);
    }
  }

  /**
   * Mark a single message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.findOne(messageId);

    if (message.receiverId !== userId) {
      throw new BadRequestException('You can only mark your own messages as read');
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      return this.messagesRepository.save(message);
    }

    return message;
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.messagesRepository.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    return count;
  }

  /**
   * Search messages by content
   */
  async searchMessages(userId: string, searchTerm: string): Promise<Message[]> {
    const messages = await this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where('(message.senderId = :userId OR message.receiverId = :userId)', { userId })
      .andWhere('message.content ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orderBy('message.createdAt', 'DESC')
      .limit(50)
      .getMany();

    return messages;
  }
}