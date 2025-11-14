import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { BusinessService } from './business.service';
import { BusinessInteractDto } from './dto';
import { GetBusinessDto } from './dto/get-business.dto';

@ApiTags('Businesses')
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get('get-business')
  @ApiResponse({ status: 200, description: 'Found business' })
  @ApiResponse({ status: 403, description: 'Business not found' })
  async getBusiness(@Query() dto: GetBusinessDto) {
    return await this.businessService.getBusiness(dto);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('collect-money')
  @ApiResponse({ status: 201, description: 'Money collected' })
  @ApiResponse({ status: 403, description: 'Business not found' })
  async collectMoney(@Body() dto: BusinessInteractDto, @GetUser() user: User) {
    return await this.businessService.collectMoney(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('upgrade-business')
  @ApiResponse({ status: 201, description: 'Business upgraded' })
  @ApiResponse({
    status: 403,
    description: 'Business not found or not enoguh money',
  })
  async upgradeBusiness(
    @Body() dto: BusinessInteractDto,
    @GetUser() user: User,
  ) {
    return await this.businessService.upgradeBusiness(dto, user);
  }
}
