import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CollectMoneyDto {
  @ApiProperty({ example: 0, description: 'Satellite ID' })
  @IsNumber()
  satelliteId: number;
}
