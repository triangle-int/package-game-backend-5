import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class SetTradePriceDto {
  @ApiProperty({ example: 1, description: 'Trade ID' })
  @IsNumber()
  tradeId: number;

  @ApiProperty({ example: 1, description: 'New price' })
  @IsNumber()
  @IsPositive()
  price: number;
}
