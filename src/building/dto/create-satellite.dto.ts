import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';
import { CreateBuildingDto } from './create-building.dto';

export class CreateSatelliteDto extends CreateBuildingDto {
  @ApiProperty({ example: 1, description: 'Satellite level' })
  @IsNumber()
  @Min(1)
  @Max(3)
  level: number;
}
