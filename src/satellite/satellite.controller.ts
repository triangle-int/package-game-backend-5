import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { CollectMoneyDto } from './dto';
import { SatelliteService } from './satellite.service';

@ApiTags('Satellites')
@Controller('satellite')
export class SatelliteController {
  constructor(private satelliteService: SatelliteService) {}

  @UseGuards(AuthGuard('firebase'))
  @Post('collect-money')
  @ApiResponse({ status: 200, description: 'Money collected' })
  @ApiResponse({ status: 403, description: 'Satellite not found' })
  async collectMoney(@Body() dto: CollectMoneyDto, @GetUser() user: User) {
    return await this.satelliteService.collectMoney(dto, user);
  }
}
