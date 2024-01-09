import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { FirebaseUser } from '@tfarras/nestjs-firebase-auth';
import { Request } from 'express';
import { AdminGuard } from '../helpers/guard/admin.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import {
  CreateAccountDto,
  SetFcmTokenDto,
  SetLocationDto,
  SetTutorialDto,
} from './dto';
import { UserService } from './user.service';
import { GetBuildingsDto } from '../building/dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(AuthGuard('firebase'))
  @Get('me')
  @ApiResponse({ status: 200, description: 'User found' })
  async getMe(@GetUser() user: User) {
    return await this.userService.getMe(user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('create')
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 403, description: 'Nickname taken' })
  createAccount(@Body() dto: CreateAccountDto, @Req() req: Request) {
    return this.userService.createAccount(dto, req.user as FirebaseUser);
  }

  @UseGuards(AdminGuard)
  @Get('get-test-token')
  @ApiResponse({ status: 200, description: 'Token returned' })
  async getTestToken() {
    return { token: await this.userService.getTestToken() };
  }

  @UseGuards(AdminGuard)
  @Post('generate-beta-token')
  @ApiResponse({ status: 200, description: 'Generated token' })
  async generateBetaToken() {
    return { token: await this.userService.generateBetaToken() };
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('set-fcm-token')
  @ApiResponse({ status: 201, description: 'Updated' })
  async setFcmToken(@Body() dto: SetFcmTokenDto, @GetUser() user: User) {
    return await this.userService.setFcmToken(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('set-tutorial')
  @ApiResponse({ status: 201, description: 'Updated' })
  async setTutorial(@Body() dto: SetTutorialDto, @GetUser() user: User) {
    return await this.userService.setTutorial(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Get('get-tutorial')
  @ApiResponse({ status: 200, description: 'Token' })
  getTutorial(@GetUser() user: User) {
    return user.tutorial;
  }

  @SkipThrottle()
  @UseGuards(AuthGuard('firebase'))
  @Post('set-location')
  @ApiResponse({ status: 201, description: 'updated' })
  async SetLocation(@Body() dto: SetLocationDto, @GetUser() user: User) {
    return await this.userService.setLocation(dto, user);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard('firebase'))
  @Get('get-users-in-bounds')
  @ApiResponse({ status: 200, description: 'found' })
  async GetUsersInBounds(@Query() dto: GetBuildingsDto, @GetUser() user: User) {
    return await this.userService.getUsersInBounds(dto, user);
  }
}
