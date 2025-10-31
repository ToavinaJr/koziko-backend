import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  Query 
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto, MarkAsReadDto } from './dto/update-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Create a new message (direct or group)
   * POST /messages
   */
  @Post()
  create(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    // Ensure the authenticated user is the sender
    createMessageDto.senderId = req.user.id;
    return this.messagesService.create(createMessageDto);
  }

  /**
   * Get all messages (admin/debug only)
   * GET /messages
   */
  @Get()
  findAll() {
    return this.messagesService.findAll();
  }

  /**
   * Get all direct conversations for the authenticated user
   * GET /messages/conversations
   */
  @Get('conversations')
  getDirectConversations(@Request() req) {
    return this.messagesService.getDirectConversations(req.user.id);
  }

  /**
   * Delete a direct conversation with another user
   * DELETE /messages/conversations/:otherUserId
   */
  @Delete('conversations/:otherUserId')
  deleteConversation(@Param('otherUserId') otherUserId: string, @Request() req) {
    return this.messagesService.deleteConversation(req.user.id, otherUserId);
  }

  /**
   * Get messages for a direct conversation with another user
   * GET /messages/conversation/:otherUserId
   */
  @Get('conversation/:otherUserId')
  getConversationMessages(@Param('otherUserId') otherUserId: string, @Request() req) {
    return this.messagesService.getConversationMessages(req.user.id, otherUserId);
  }

  /**
   * Get messages for a group
   * GET /messages/group/:groupId
   */
  @Get('group/:groupId')
  getGroupMessages(@Param('groupId') groupId: string) {
    return this.messagesService.getGroupMessages(groupId);
  }

  /**
   * Get unread message count
   * GET /messages/unread/count
   */
  @Get('unread/count')
  getUnreadCount(@Request() req) {
    return this.messagesService.getUnreadCount(req.user.id);
  }

  /**
   * Search messages
   * GET /messages/search?q=searchTerm
   */
  @Get('search')
  searchMessages(@Query('q') searchTerm: string, @Request() req) {
    return this.messagesService.searchMessages(req.user.id, searchTerm);
  }

  /**
   * Mark messages as read
   * POST /messages/mark-as-read
   */
  @Post('mark-as-read')
  markAsRead(@Body() markAsReadDto: MarkAsReadDto, @Request() req) {
    return this.messagesService.markAsRead(req.user.id, markAsReadDto);
  }

  /**
   * Mark a single message as read
   * PATCH /messages/:id/read
   */
  @Patch(':id/read')
  markMessageAsRead(@Param('id') id: string, @Request() req) {
    return this.messagesService.markMessageAsRead(id, req.user.id);
  }

  /**
   * Get a single message
   * GET /messages/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }

  /**
   * Update a message (edit content)
   * PATCH /messages/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMessageDto: UpdateMessageDto) {
    return this.messagesService.update(id, updateMessageDto);
  }

  /**
   * Delete a message
   * DELETE /messages/:id
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.messagesService.remove(id);
  }
}