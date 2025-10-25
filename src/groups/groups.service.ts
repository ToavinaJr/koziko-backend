import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupsRepository.create(createGroupDto);
    
    // Add creator as first member
    const creator = await this.usersRepository.findOne({ 
      where: { id: createGroupDto.createdById } 
    });
    
    if (creator) {
      group.members = [creator];
    }
    
    return await this.groupsRepository.save(group);
  }

  async findAll(): Promise<Group[]> {
    return await this.groupsRepository.find({
      relations: ['createdBy', 'members'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'members', 'joinRequests'],
    });
    
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    
    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.findOne(id);
    Object.assign(group, updateGroupDto);
    return await this.groupsRepository.save(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.groupsRepository.remove(group);
  }

  // Add member to group
  async addMember(groupId: string, userId: string): Promise<Group> {
    const group = await this.findOne(groupId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // Check if user is not already a member
    const isMember = group.members.some(member => member.id === userId);
    if (!isMember) {
      group.members.push(user);
    }
    
    // Remove from join requests if present
    group.joinRequests = group.joinRequests.filter(req => req.id !== userId);
    
    return await this.groupsRepository.save(group);
  }

  // Remove member from group
  async removeMember(groupId: string, userId: string): Promise<Group> {
    const group = await this.findOne(groupId);
    group.members = group.members.filter(member => member.id !== userId);
    return await this.groupsRepository.save(group);
  }

  // Add join request
  async addJoinRequest(groupId: string, userId: string): Promise<Group> {
    const group = await this.findOne(groupId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // Check if user is not already in join requests
    const hasRequest = group.joinRequests.some(req => req.id === userId);
    if (!hasRequest) {
      group.joinRequests.push(user);
    }
    
    return await this.groupsRepository.save(group);
  }
}
