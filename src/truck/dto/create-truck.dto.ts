import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, Max, Min } from 'class-validator';
import { CalculatePathDto } from './calculate-path.dto';

export class CreateTruckDto extends CalculatePathDto {
  @ApiProperty({ example: 'wheel', description: 'Resource name' })
  @IsString()
  resourceName: string;

  @ApiProperty({ example: true, description: 'Should create schedule' })
  @IsBoolean()
  createSchedule: boolean;

  @ApiProperty({
    example: 1,
    description: 'Schedule interval (0 - 1 hour, 1 - 6 hours, 2 - 12 hours)',
  })
  @IsNumber()
  @Min(0)
  @Max(2)
  interval: number;
}
