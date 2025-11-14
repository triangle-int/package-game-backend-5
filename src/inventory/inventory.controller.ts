import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @UseGuards(AuthGuard('firebase'))
  @Get('fetch')
  @ApiResponse({ status: 200, description: 'Inventory fetched' })
  async getInventory(@GetUser() user: User) {
    return { inventory: await this.inventoryService.getUserInventory(user) };
  }
}
