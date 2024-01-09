import { ApiProperty } from '@nestjs/swagger';
import { IsLatLong } from 'class-validator';

export class GetBuildingsDto {
  @ApiProperty({
    example: '51.48,0',
    description: 'South west corner of bounds',
  })
  @IsLatLong()
  minCoords: string;

  @ApiProperty({
    example: '51.48,0',
    description: 'North east corner of bounds',
  })
  @IsLatLong()
  maxCoords: string;
}
