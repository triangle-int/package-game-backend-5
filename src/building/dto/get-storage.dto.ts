import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class GetStorageDto {
  @ApiProperty({ example: 0, description: 'Building ID' })
  @IsNumberString()
  buildingId: string;
}
