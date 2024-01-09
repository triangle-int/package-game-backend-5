import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ActivateBoosterDto {
  @ApiProperty({
    example: 'businessIncomeBooster',
    description: 'Booster type',
  })
  @IsString()
  boosterType: string;
}
