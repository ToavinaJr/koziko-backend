import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateMessageDto } from './create-message.dto';

export class UpdateMessageDto extends PartialType(CreateMessageDto) {
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

export class MarkAsReadDto {
  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  senderId?: string;
}
