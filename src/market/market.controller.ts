import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { GetMarketDto } from './dto';
import { MarketService } from './market.service';

@ApiTags('Markets')
@Controller('market')
export class MarketController {
  constructor(private marketService: MarketService) {}

  @UseGuards(AuthGuard('firebase'))
  @Get('get-market')
  @ApiResponse({ status: 200, description: 'Market found' })
  @ApiResponse({ status: 403, description: 'Market not found' })
  async getMarket(@Query() dto: GetMarketDto, @GetUser() user: User) {
    return await this.marketService.getMarket(dto, user);
  }
}
