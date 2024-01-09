import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';

export class ToggleFactoryDto {
  @ApiProperty({ example: 0, description: 'Factory ID' })
  @IsNumber()
  factoryId: number;

  @ApiProperty({ example: true, description: 'Factory state' })
  @IsBoolean()
  state: boolean;
}
