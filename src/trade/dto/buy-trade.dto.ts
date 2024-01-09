import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class BuyTradeDto {
  @ApiProperty({ example: 1, description: 'Trade ID' })
  @IsNumber()
  tradeId: number;

  @ApiProperty({ example: 100, description: 'Resources count' })
  @IsNumber()
  @IsPositive()
  resourcesCount: number;
}
