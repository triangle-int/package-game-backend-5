import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class GetMarketDto {
  @ApiProperty({ example: '0', description: 'Market ID' })
  @IsNumberString()
  marketId: string;
}
