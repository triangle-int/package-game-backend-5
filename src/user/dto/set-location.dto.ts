import { ApiProperty } from '@nestjs/swagger';
import { IsLatLong } from 'class-validator';

export class SetLocationDto {
  @ApiProperty({
    example: '51.48,0',
    description: 'Building latitude and longitude',
  })
  @IsLatLong()
  location: string;
}
