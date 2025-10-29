import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsUUID()
  @IsNotEmpty()
  senderId: string;

  // For direct messages
  @IsUUID()
  @IsOptional()
  receiverId?: string;

  // For group messages
  @IsUUID()
  @IsOptional()
  groupId?: string;

  // Conversation ID will be auto-generated for direct messages
  @IsString()
  @IsOptional()
  conversationId?: string;
}
