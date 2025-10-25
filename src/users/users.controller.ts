import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put('me')
  update(@Request() req, @Body() updateUserDto: any) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Delete('me')
  remove(@Request() req) {
    return this.usersService.remove(req.user.id);
  }

  // Follow endpoints
  @Post('follow/:userId')
  sendFollowRequest(@Request() req, @Param('userId') userId: string) {
    return this.usersService.sendFollowRequest(req.user.id, userId);
  }

  @Post('follow-requests/:requestId/accept')
  acceptFollowRequest(@Param('requestId') requestId: string) {
    return this.usersService.acceptFollowRequest(requestId);
  }

  @Post('follow-requests/:requestId/reject')
  rejectFollowRequest(@Param('requestId') requestId: string) {
    return this.usersService.rejectFollowRequest(requestId);
  }

  @Delete('unfollow/:userId')
  unfollow(@Request() req, @Param('userId') userId: string) {
    return this.usersService.unfollow(req.user.id, userId);
  }

  @Get('follow-requests/pending')
  getFollowRequests(@Request() req) {
    return this.usersService.getFollowRequests(req.user.id);
  }
}