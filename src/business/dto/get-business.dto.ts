import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class GetBusinessDto {
  @ApiProperty({ example: 0, description: 'Business ID' })
  @IsNumberString()
  businessId: string;
}
