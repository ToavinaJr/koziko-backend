import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Body() createCommentDto: CreateCommentDto) {
    return this.commentsService.create(createCommentDto);
  }

  @Get()
  findAll(@Query('postId') postId?: string) {
    if (postId) {
      return this.commentsService.findByPost(postId);
    }
    return this.commentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentsService.update(id, updateCommentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }

  // Add reaction to comment
  @Put(':id/reactions/:emoji/:userId')
  addReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @Param('userId') userId: string,
  ) {
    return this.commentsService.addReaction(id, emoji, userId);
  }

  // Remove reaction from comment
  @Delete(':id/reactions/:emoji/:userId')
  removeReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @Param('userId') userId: string,
  ) {
    return this.commentsService.removeReaction(id, emoji, userId);
  }
}
