import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class CalculatePathDto {
  @ApiProperty({ example: 1, description: 'Start building ID' })
  @IsInt()
  @Min(1)
  aId: number;

  @ApiProperty({ example: 2, description: 'End building ID' })
  @IsInt()
  @Min(1)
  bId: number;

  @ApiProperty({ example: 1, description: 'Truck type' })
  @IsInt()
  @Max(2)
  @Min(0)
  truckType: number;

  @ApiProperty({ example: 100, description: 'Resource count' })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  resourceCount: number;
}
