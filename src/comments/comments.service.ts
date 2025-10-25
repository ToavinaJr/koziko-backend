import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const comment = this.commentsRepository.create(createCommentDto);
    const savedComment = await this.commentsRepository.save(comment);
    
    // Reload with author relation
    const commentWithAuthor = await this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author'],
    });
    
    if (!commentWithAuthor) {
      throw new NotFoundException('Failed to load comment with author');
    }
    
    return commentWithAuthor;
  }

  async findAll(): Promise<Comment[]> {
    return await this.commentsRepository.find({
      relations: ['author', 'post'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPost(postId: string): Promise<Comment[]> {
    return await this.commentsRepository.find({
      where: { postId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author', 'post'],
    });
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    return comment;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.findOne(id);
    Object.assign(comment, updateCommentDto);
    const updated = await this.commentsRepository.save(comment);
    
    // Reload with author relation
    const commentWithAuthor = await this.commentsRepository.findOne({
      where: { id: updated.id },
      relations: ['author'],
    });
    
    if (!commentWithAuthor) {
      throw new NotFoundException('Failed to load updated comment with author');
    }
    
    return commentWithAuthor;
  }

  async remove(id: string): Promise<void> {
    const comment = await this.findOne(id);
    await this.commentsRepository.remove(comment);
  }

  // Add reaction to comment
  async addReaction(commentId: string, emoji: string, userId: string): Promise<Comment> {
    const comment = await this.findOne(commentId);
    
    // Remove user from all other reactions
    Object.keys(comment.reactions).forEach(key => {
      comment.reactions[key] = comment.reactions[key].filter(id => id !== userId);
      if (comment.reactions[key].length === 0) {
        delete comment.reactions[key];
      }
    });
    
    // Add user to selected emoji
    if (!comment.reactions[emoji]) {
      comment.reactions[emoji] = [];
    }
    if (!comment.reactions[emoji].includes(userId)) {
      comment.reactions[emoji].push(userId);
    }
    
    const updated = await this.commentsRepository.save(comment);
    
    // Reload with author relation
    const commentWithAuthor = await this.commentsRepository.findOne({
      where: { id: updated.id },
      relations: ['author'],
    });
    
    if (!commentWithAuthor) {
      throw new NotFoundException('Failed to load comment with author');
    }
    
    return commentWithAuthor;
  }

  // Remove reaction from comment
  async removeReaction(commentId: string, emoji: string, userId: string): Promise<Comment> {
    const comment = await this.findOne(commentId);
    
    if (comment.reactions[emoji]) {
      comment.reactions[emoji] = comment.reactions[emoji].filter(id => id !== userId);
      if (comment.reactions[emoji].length === 0) {
        delete comment.reactions[emoji];
      }
    }
    
    const updated = await this.commentsRepository.save(comment);
    
    // Reload with author relation
    const commentWithAuthor = await this.commentsRepository.findOne({
      where: { id: updated.id },
      relations: ['author'],
    });
    
    if (!commentWithAuthor) {
      throw new NotFoundException('Failed to load comment with author');
    }
    
    return commentWithAuthor;
  }
}
