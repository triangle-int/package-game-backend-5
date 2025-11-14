import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import {
  CalculatePathDto,
  CreateTruckDto,
  RemoveTruckScheduleDto,
} from './dto';
import { TruckService } from './truck.service';

@ApiTags('Trucks')
@Controller('truck')
export class TruckController {
  constructor(private truckService: TruckService) {}

  @UseGuards(AuthGuard('firebase'))
  @Post('calculate-path-cost')
  @ApiResponse({ status: 201, description: 'Truck path cost calculated' })
  @ApiResponse({
    status: 403,
    description:
      'Building not found or invalid start/destination or mapbox refused to work',
  })
  async calculatePathCost(
    @Body() dto: CalculatePathDto,
    @GetUser() user: User,
  ) {
    return await this.truckService.calculatePathCost(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('create-truck')
  @ApiResponse({ status: 201, description: 'Truck created' })
  @ApiResponse({
    status: 403,
    description: 'Not enough money or not enough resources',
  })
  async createTruck(@Body() dto: CreateTruckDto, @GetUser() user: User) {
    return await this.truckService.createTruck(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Get('get-delivery-targets')
  @ApiResponse({ status: 200, description: 'Found targets' })
  async getDeliveryTargets(@GetUser() user: User) {
    return await this.truckService.getDeliveryTargets(user);
  }

  @Get('get-trucks')
  @ApiResponse({ status: 200, description: 'All trucks' })
  async getTrucks() {
    return await this.truckService.getTrucks();
  }

  @UseGuards(AuthGuard('firebase'))
  @Get('get-schedules')
  @ApiResponse({ status: 200, description: 'All schedules' })
  async getSchedules(@GetUser() user: User) {
    return await this.truckService.getSchedules(user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('remove-truck-schedule')
  @ApiResponse({ status: 201, description: 'Truck schedule removed' })
  async removeTruckSchedule(
    @Body() dto: RemoveTruckScheduleDto,
    @GetUser() user: User,
  ) {
    await this.truckService.removeTruckSchedule(dto, user);
  }
}
