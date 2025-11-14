import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { GetFactoryDto, SetFactoryResourceDto } from './dto';
import { ToggleFactoryDto } from './dto/toggle-factory.dto';
import { FactoryService } from './factory.service';

@ApiTags('Factories')
@Controller('factory')
export class FactoryController {
  constructor(private factoryService: FactoryService) {}

  @UseGuards(AuthGuard('firebase'))
  @Post('set-factory-resource')
  @ApiResponse({ status: 201, description: 'Resource set' })
  @ApiResponse({
    status: 403,
    description: 'Factory not found or invalid resource',
  })
  async setFactoryResource(
    @Body() dto: SetFactoryResourceDto,
    @GetUser() user: User,
  ) {
    return await this.factoryService.setFactoryResource(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('toggle-factory')
  @ApiResponse({ status: 201, description: 'Factory toggled' })
  @ApiResponse({
    status: 403,
    description: 'Factory not found or already toggled or not enough money',
  })
  async toggleFactory(@Body() dto: ToggleFactoryDto, @GetUser() user: User) {
    return await this.factoryService.toggleFactory(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('upgrade-factory')
  @ApiResponse({ status: 201, description: 'Factory upgraded' })
  @ApiResponse({
    status: 403,
    description: 'Factory not found or not enough resources',
  })
  async upgradeFactory(@Body() dto: GetFactoryDto, @GetUser() user: User) {
    return await this.factoryService.upgradeFactory(dto, user);
  }

  @Get('get-factory')
  @ApiResponse({ status: 200, description: 'Factory found' })
  @ApiResponse({ status: 403, description: 'Factory not found' })
  async getFactory(@Query() dto: GetFactoryDto) {
    return await this.factoryService.getFactory(dto);
  }
}
