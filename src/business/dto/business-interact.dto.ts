import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class BusinessInteractDto {
  @ApiProperty({ example: 0, description: 'Business ID' })
  @IsNumber()
  businessId: number;
}
