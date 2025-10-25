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
    await this.usersRepository.update(id, updateUserDto);
    const updatedUser = await this.findOne(id);
    console.log('Updated user:', updatedUser);
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  // Follow functionality
  async sendFollowRequest(fromUserId: string, toUserId: string): Promise<FollowRequest> {
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

    // Update request status
    request.status = FollowRequestStatus.ACCEPTED;
    await this.followRequestsRepository.save(request);

    // Add follower relationship
    const fromUser = await this.findOne(request.senderId);
    const toUser = await this.findOne(request.receiverId);

    if (!toUser.followers) toUser.followers = [];
    if (!fromUser.following) fromUser.following = [];

    toUser.followers.push(fromUser);
    fromUser.following.push(toUser);

    await this.usersRepository.save([fromUser, toUser]);
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
    return this.followRequestsRepository.find({
      where: { receiverId: userId, status: FollowRequestStatus.PENDING },
      relations: ['sender'],
    });
  }
}