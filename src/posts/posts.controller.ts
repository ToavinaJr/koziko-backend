import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Put,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
  ) {}

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  @Get()
  findAll(@Query('authorId') authorId?: string) {
    return this.postsService.findAll(authorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }

  // Add reaction to post
  @Put(':id/reactions/:emoji/:userId')
  addReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @Param('userId') userId: string,
  ) {
    return this.postsService.addReaction(id, emoji, userId);
  }

  // Remove reaction from post
  @Delete(':id/reactions/:emoji/:userId')
  removeReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @Param('userId') userId: string,
  ) {
    return this.postsService.removeReaction(id, emoji, userId);
  }
}
