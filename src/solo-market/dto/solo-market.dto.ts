import { IsInt, IsPositive, IsString, Max } from 'class-validator';

export class SoloMarketDto {
  @IsString()
  resource: string;

  @IsInt()
  @IsPositive()
  @Max(100000)
  count: number;
}
