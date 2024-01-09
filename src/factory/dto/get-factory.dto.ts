import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class GetFactoryDto {
  @ApiProperty({ example: 0, description: 'Factory ID' })
  @IsNumberString()
  factoryId: string;
}
