import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FollowRequest, FollowRequestStatus } from './entities/follow-request.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(FollowRequest)
    private followRequestsRepository: Repository<FollowRequest>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['followers', 'following'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['followers', 'following', 'groups'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    console.log('Updating user:', id, 'with:', updateUserDto);
    
    // Clean up empty strings to prevent database errors
    const cleanedDto: any = { ...updateUserDto };
    
    // Remove empty strings and set them to null or undefined
    Object.keys(cleanedDto).forEach(key => {
      if (cleanedDto[key] === '' || cleanedDto[key] === null) {
        if (key === 'dateOfBirth') {
          cleanedDto[key] = null;
        }
      }
    });
    
    console.log('Cleaned DTO:', cleanedDto);
    
    await this.usersRepository.update(id, cleanedDto as any);
    const updatedUser = await this.findOne(id);
    console.log('Updated user:', updatedUser);
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  // Follow functionality
  async sendFollowRequest(fromUserId: string, toUserId: string): Promise<FollowRequest> {
    // Check if there's already a pending request from the other user
    const existingRequest = await this.followRequestsRepository.findOne({
      where: [
        // Check if toUser already sent a request to fromUser
        {
          senderId: toUserId,
          receiverId: fromUserId,
          status: FollowRequestStatus.PENDING,
        },
        // Check if fromUser already sent a request to toUser
        {
          senderId: fromUserId,
          receiverId: toUserId,
          status: FollowRequestStatus.PENDING,
        },
      ],
    });

    // If toUser already sent a request to fromUser, auto-accept it instead
    if (existingRequest && existingRequest.senderId === toUserId) {
      // Auto-accept the existing request
      await this.acceptFollowRequest(existingRequest.id);
      return existingRequest;
    }

    // If fromUser already sent a request to toUser, return the existing one
    if (existingRequest && existingRequest.senderId === fromUserId) {
      return existingRequest;
    }

    // Create new request
    const followRequest = this.followRequestsRepository.create({
      senderId: fromUserId,
      receiverId: toUserId,
      status: FollowRequestStatus.PENDING,
    });
    return this.followRequestsRepository.save(followRequest);
  }

  async acceptFollowRequest(requestId: string): Promise<void> {
    const request = await this.followRequestsRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Follow request not found');
    }

    // Check if relationship already exists
    const existingRelation = await this.usersRepository
      .createQueryBuilder()
      .select('1')
      .from('user_followers', 'uf')
      .where('uf.userId = :receiverId', { receiverId: request.receiverId })
      .andWhere('uf.followerId = :senderId', { senderId: request.senderId })
      .getRawOne();

    if (existingRelation) {
      // Relationship already exists, just update the request status
      request.status = FollowRequestStatus.ACCEPTED;
      await this.followRequestsRepository.save(request);
      return;
    }

    // Update request status
    request.status = FollowRequestStatus.ACCEPTED;
    await this.followRequestsRepository.save(request);

    // Add follower relationship using query builder to avoid duplicates
    await this.usersRepository
      .createQueryBuilder()
      .insert()
      .into('user_followers')
      .values({
        userId: request.receiverId,
        followerId: request.senderId,
      })
      .orIgnore() // Ignore if already exists (PostgreSQL)
      .execute();
  }

  async rejectFollowRequest(requestId: string): Promise<void> {
    const request = await this.followRequestsRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Follow request not found');
    }

    request.status = FollowRequestStatus.REJECTED;
    await this.followRequestsRepository.save(request);
  }

  async unfollow(userId: string, unfollowUserId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['following'],
    });
    const unfollowUser = await this.usersRepository.findOne({
      where: { id: unfollowUserId },
      relations: ['followers'],
    });

    if (!user || !unfollowUser) {
      throw new NotFoundException('User not found');
    }

    user.following = user.following.filter((u) => u.id !== unfollowUserId);
    unfollowUser.followers = unfollowUser.followers.filter((u) => u.id !== userId);

    await this.usersRepository.save([user, unfollowUser]);
  }

  async getFollowRequests(userId: string): Promise<FollowRequest[]> {
    // Get both received and sent requests
    const received = await this.followRequestsRepository.find({
      where: { receiverId: userId, status: FollowRequestStatus.PENDING },
      relations: ['sender'],
    });

    const sent = await this.followRequestsRepository.find({
      where: { senderId: userId, status: FollowRequestStatus.PENDING },
      relations: ['receiver'],
    });

    // Return all requests with proper formatting
    return [...received, ...sent];
  }

  async getFollowers(userId: string): Promise<User[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['followers'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.followers || [];
  }

  async getFollowing(userId: string): Promise<User[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['following'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.following || [];
  }

  async getDiscoverUsers(currentUserId: string): Promise<User[]> {
    // Get all users except:
    // 1. The current user
    // 2. Users the current user is already following
    // 3. Users who are following the current user
    // 4. Users with pending follow requests (sent or received)
    
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId })
      // Exclude users we're following
      .andWhere(`user.id NOT IN (
        SELECT "followerId" FROM user_followers WHERE "userId" = :currentUserId
      )`, { currentUserId })
      // Exclude users following us
      .andWhere(`user.id NOT IN (
        SELECT "userId" FROM user_followers WHERE "followerId" = :currentUserId
      )`, { currentUserId })
      // Exclude users with pending requests we sent
      .andWhere(`user.id NOT IN (
        SELECT "receiverId" FROM follow_requests 
        WHERE "senderId" = :currentUserId AND status = :pendingStatus
      )`, { currentUserId, pendingStatus: FollowRequestStatus.PENDING })
      // Exclude users who sent us pending requests
      .andWhere(`user.id NOT IN (
        SELECT "senderId" FROM follow_requests 
        WHERE "receiverId" = :currentUserId AND status = :pendingStatus
      )`, { currentUserId, pendingStatus: FollowRequestStatus.PENDING })
      .getMany();

    return users;
  }
}