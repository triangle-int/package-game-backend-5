import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingService } from './building.service';
import {
  GetBuildingsDto,
  CreateBuildingDto,
  RemoveBuildingDto,
  CreateSatelliteDto,
  GetStorageDto,
} from './dto';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Buildings')
@Controller('building')
export class BuildingController {
  constructor(private buildingsService: BuildingService) {}

  @SkipThrottle()
  @Get('get')
  @ApiResponse({ status: 200, description: 'Found buildings' })
  async getBuildings(@Query() dto: GetBuildingsDto) {
    return { buildings: await this.buildingsService.getBuildings(dto) };
  }

  @Get('get-all')
  @ApiResponse({ status: 200, description: 'Found buildings' })
  async getAllBuildings() {
    return { buildings: await this.buildingsService.getAllBuildings() };
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('create-business')
  @ApiResponse({ status: 201, description: 'Business created' })
  @ApiResponse({
    status: 403,
    description: 'Not enoguh money or cell already taken',
  })
  async createBusiness(@Body() dto: CreateBuildingDto, @GetUser() user: User) {
    return await this.buildingsService.createBusiness(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('create-storage')
  @ApiResponse({ status: 201, description: 'Storage created' })
  @ApiResponse({
    status: 403,
    description: 'Storage already excists or cell already taken',
  })
  async createStorage(@Body() dto: CreateBuildingDto, @GetUser() user: User) {
    return await this.buildingsService.createStorage(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('create-factory')
  @ApiResponse({ status: 201, description: 'Factory created' })
  @ApiResponse({
    status: 403,
    description: 'Too many factories or cell already taken',
  })
  async createFactory(@Body() dto: CreateBuildingDto, @GetUser() user: User) {
    return await this.buildingsService.createFactory(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Get('get-storage')
  @ApiResponse({ status: 200, description: 'Storage found' })
  @ApiResponse({ status: 403, description: 'Storage not found' })
  async getStorage(@Query() dto: GetStorageDto, @GetUser() user: User) {
    return await this.buildingsService.getStorage(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('remove-building')
  @ApiResponse({ status: 200, description: 'Building removed' })
  @ApiResponse({ status: 403, description: 'Building not found' })
  async removeBuilding(@Body() dto: RemoveBuildingDto, @GetUser() user: User) {
    return await this.buildingsService.removeBuilding(dto, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('create-satellite')
  @ApiResponse({ status: 201, description: 'Satellite created' })
  @ApiResponse({
    status: 403,
    description: 'Not enoguh money or cell already taken',
  })
  async createSatellite(
    @Body() dto: CreateSatelliteDto,
    @GetUser() user: User,
  ) {
    return await this.buildingsService.createSatellite(dto, user);
  }
}
