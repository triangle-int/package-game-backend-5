import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, Min } from 'class-validator';

export class GetTradesDto {
  @ApiProperty({ example: 0, description: 'Trades page' })
  @IsInt()
  @Min(0)
  page: number;

  @ApiProperty({ example: [], description: 'Resources to filter' })
  @IsArray()
  resources: string[];

  @ApiProperty({ example: 'Player', description: 'Player nickname' })
  @IsString()
  nickname: string;
}
