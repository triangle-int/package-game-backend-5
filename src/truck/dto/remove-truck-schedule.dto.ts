import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class RemoveTruckScheduleDto {
  @ApiProperty({ example: 0, description: 'Schedule id' })
  @IsNumber()
  scheduleId: number;
}
