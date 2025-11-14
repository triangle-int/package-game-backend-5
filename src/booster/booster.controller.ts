import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { BoosterService } from './booster.service';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { ActivateBoosterDto } from './dto';

@ApiTags('Boosters')
@Controller('booster')
export class BoosterController {
  constructor(private boosterService: BoosterService) {}

  @UseGuards(AuthGuard('firebase'))
  @Post('activate-booster')
  @ApiResponse({ status: 201, description: 'Booster activated' })
  @ApiResponse({ status: 403, description: 'Booster not found' })
  async activateBooster(
    @Body() dto: ActivateBoosterDto,
    @GetUser() user: User,
  ) {
    return await this.boosterService.activateBooster(user, dto);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('buy-booster')
  @ApiResponse({ status: 201, description: 'Booster bought' })
  @ApiResponse({ status: 403, description: 'Not enought gems' })
  async buyBooster(@Body() dto: ActivateBoosterDto, @GetUser() user: User) {
    await this.boosterService.buyBooster(user, dto);
  }

  @UseGuards(AuthGuard('firebase'))
  @Get('get-boosters')
  @ApiResponse({ status: 200, description: 'Boosters found' })
  async getBoosters(@GetUser() user: User) {
    return await this.boosterService.getBoosters(user);
  }
}
