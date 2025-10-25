import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;
}
