import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GameConfigService } from './game-config.service';

@ApiTags('Config')
@Controller('config')
export class GameConfigController {
  constructor(private config: GameConfigService) {}

  @Get('/')
  @ApiResponse({ status: 200, description: 'Config returned' })
  getConfig() {
    return this.config.config;
  }
}
