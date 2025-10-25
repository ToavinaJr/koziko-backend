import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const message = this.messagesRepository.create(createMessageDto);
    return this.messagesRepository.save(message);
  }

  async findAll(): Promise<Message[]> {
    return this.messagesRepository.find({
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async update(id: string, updateMessageDto: UpdateMessageDto): Promise<Message> {
    const message = await this.findOne(id);
    
    Object.assign(message, updateMessageDto);
    message.isEdited = true;
    
    return this.messagesRepository.save(message);
  }

  async remove(id: string): Promise<void> {
    const message = await this.findOne(id);
    await this.messagesRepository.remove(message);
  }

  // Get all conversations for a user
  async getConversations(userId: string): Promise<any[]> {
    // First, get all unique conversation IDs where the user has sent messages
    const userConversations = await this.messagesRepository
      .createQueryBuilder('message')
      .select('DISTINCT message.conversationId', 'conversationId')
      .where('message.senderId = :userId', { userId })
      .getRawMany();

    const conversationIds = userConversations.map(c => c.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

    // Get the last message for each conversation
    const messages = await this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    // Get all unique participants (senders) for all conversations in one query
    const allParticipants = await this.messagesRepository
      .createQueryBuilder('message')
      .select('message.conversationId', 'conversationId')
      .addSelect('message.senderId', 'userId')
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .distinct(true)
      .getRawMany();

    // Group participants by conversationId
    const participantsByConversation = new Map<string, string[]>();
    for (const row of allParticipants) {
      if (!participantsByConversation.has(row.conversationId)) {
        participantsByConversation.set(row.conversationId, []);
      }
      if (!participantsByConversation.get(row.conversationId)!.includes(row.userId)) {
        participantsByConversation.get(row.conversationId)!.push(row.userId);
      }
    }

    // Group messages by conversationId and keep only the last message
    const conversationsMap = new Map();
    
    for (const message of messages) {
      if (!conversationsMap.has(message.conversationId)) {
        conversationsMap.set(message.conversationId, {
          id: message.conversationId,
          lastMessage: message,
          updatedAt: message.updatedAt,
          participants: participantsByConversation.get(message.conversationId) || [],
        });
      }
    }

    return Array.from(conversationsMap.values());
  }

  // Get all messages for a conversation
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.messagesRepository.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  // Get participants of a conversation
  private async getConversationParticipants(conversationId: string): Promise<string[]> {
    const messages = await this.messagesRepository
      .createQueryBuilder('message')
      .select('DISTINCT message.senderId', 'senderId')
      .where('message.conversationId = :conversationId', { conversationId })
      .getRawMany();

    return messages.map(m => m.senderId);
  }
}
