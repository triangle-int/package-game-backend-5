import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { BuyTradeDto, GetTradesDto, SetTradePriceDto } from './dto';
import { TradeService } from './trade.service';

@ApiTags('Trades')
@Controller('trade')
export class TradeController {
  constructor(private tradeService: TradeService) {}

  @UseGuards(AuthGuard('firebase'))
  @Post('get-trades')
  @ApiResponse({ status: 200, description: 'Trades returned' })
  async getTrades(@Body() dto: GetTradesDto) {
    return await this.tradeService.getTrades(dto);
  }

  @UseGuards(AuthGuard('firebase'))
  @Get('my-trades')
  @ApiResponse({ status: 200, description: 'User trades' })
  async getMyTrades(@GetUser() user: User) {
    return await this.tradeService.getUserTrades(user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('set-price')
  @ApiResponse({ status: 201, description: 'Updated price' })
  async setTradePrice(@Body() dto: SetTradePriceDto, @GetUser() user: User) {
    return await this.tradeService.updateTradePrice(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('buy-trade')
  @ApiResponse({ status: 201, description: 'Bought trade' })
  @ApiResponse({
    status: 403,
    description:
      "Trade not found or doesn't contain enough resources or not enough money",
  })
  async buyTrade(@Body() dto: BuyTradeDto, @GetUser() user: User) {
    return await this.tradeService.buyTrade(dto, user);
  }
}
