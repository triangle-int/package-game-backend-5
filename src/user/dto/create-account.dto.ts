import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatLong,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { IsEmoji } from '../../validator/emoji.validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Player', description: 'Player nickname' })
  @IsString()
  @MinLength(3)
  @MaxLength(15)
  nickname: string;

  @ApiProperty({ example: '🤡', description: 'Player avatar' })
  @IsString()
  @IsNotEmpty()
  @Validate(IsEmoji)
  avatar: string;

  @ApiProperty({ example: '51.48,0', description: 'Player coordinates' })
  @IsString()
  @IsLatLong()
  location: string;
}
