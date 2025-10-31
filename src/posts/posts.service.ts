import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(createPostDto);
    const savedPost = await this.postsRepository.save(post);
    // Return the post with all relations loaded
    return await this.findOne(savedPost.id);
  }

  async findAll(authorId?: string): Promise<Post[]> {
    const findOptions: any = {
      relations: ['author', 'comments', 'comments.author'],
      order: { createdAt: 'DESC' },
    };

    if (authorId) {
      // Filter by authorId
      return await this.postsRepository.find({
        where: { authorId },
        ...findOptions,
      });
    }

    return await this.postsRepository.find(findOptions);
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author', 'comments', 'comments.author'],
    });
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    Object.assign(post, updatePostDto);
    return await this.postsRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.findOne(id);
    await this.postsRepository.remove(post);
  }

  // Add reaction to post
  async addReaction(postId: string, emoji: string, userId: string): Promise<Post> {
    const post = await this.findOne(postId);
    
    // Remove user from all other reactions
    Object.keys(post.reactions).forEach(key => {
      post.reactions[key] = post.reactions[key].filter(id => id !== userId);
      if (post.reactions[key].length === 0) {
        delete post.reactions[key];
      }
    });
    
    // Add user to selected emoji
    if (!post.reactions[emoji]) {
      post.reactions[emoji] = [];
    }
    if (!post.reactions[emoji].includes(userId)) {
      post.reactions[emoji].push(userId);
    }
    
    return await this.postsRepository.save(post);
  }

  // Remove reaction from post
  async removeReaction(postId: string, emoji: string, userId: string): Promise<Post> {
    const post = await this.findOne(postId);
    
    if (post.reactions[emoji]) {
      post.reactions[emoji] = post.reactions[emoji].filter(id => id !== userId);
      if (post.reactions[emoji].length === 0) {
        delete post.reactions[emoji];
      }
    }
    
    return await this.postsRepository.save(post);
  }
}
