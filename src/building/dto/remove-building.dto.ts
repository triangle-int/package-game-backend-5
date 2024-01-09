import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class RemoveBuildingDto {
  @ApiProperty({ example: 0, description: 'Building ID' })
  @IsNumber()
  buildingId: number;
}
