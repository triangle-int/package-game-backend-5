import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { SoloMarketDto } from './dto/solo-market.dto';
import { SoloMarketService } from './solo-market.service';

@Controller('solo-market')
@UseGuards(AuthGuard('firebase'))
export class SoloMarketController {
  constructor(private readonly service: SoloMarketService) {}

  @Get('catalog')
  catalog() {
    return this.service.catalog();
  }

  @Post('buy')
  buy(@Body() dto: SoloMarketDto, @GetUser() user: User) {
    return this.service.buy(dto, user);
  }

  @Post('sell')
  sell(@Body() dto: SoloMarketDto, @GetUser() user: User) {
    return this.service.sell(dto, user);
  }
}
