import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    username: string,
    fullName: string,
  ): Promise<{ accessToken: string; user: User }> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      username,
      fullName,
    });

    await this.usersRepository.save(user);

    // Generate JWT token
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: User }> {
    // Find user
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async googleLogin(googleUser: any): Promise<{ access_token: string; user: User }> {
    // Check if user exists
    let user = await this.usersRepository.findOne({
      where: { email: googleUser.email },
    });

    if (!user) {
      // Create new user from Google profile
      const username = googleUser.email.split('@')[0];
      const fullName = googleUser.fullName || googleUser.email.split('@')[0];
      
      user = this.usersRepository.create({
        email: googleUser.email,
        fullName: fullName,
        username: username,
        avatarUrl: googleUser.avatarUrl || '',
        password: '', // No password for OAuth users
      });

      await this.usersRepository.save(user);
    } else {
      // Update avatar and fullName if provided
      let needsUpdate = false;
      
      if (googleUser.avatarUrl && user.avatarUrl !== googleUser.avatarUrl) {
        user.avatarUrl = googleUser.avatarUrl;
        needsUpdate = true;
      }
      
      if (googleUser.fullName && (!user.fullName || user.fullName.includes('undefined'))) {
        user.fullName = googleUser.fullName;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await this.usersRepository.save(user);
      }
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user,
    };
  }
}
