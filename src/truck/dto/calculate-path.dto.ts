import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class CalculatePathDto {
  @ApiProperty({ example: 0, description: 'Start building ID' })
  @IsNumber()
  aId: number;

  @ApiProperty({ example: 1, description: 'End building ID' })
  @IsNumber()
  bId: number;

  @ApiProperty({ example: 1, description: 'Truck type' })
  @IsNumber()
  @Max(2)
  @Min(0)
  truckType: number;

  @ApiProperty({ example: 100, description: 'Resource count' })
  @IsNumber()
  resourceCount: number;
}
