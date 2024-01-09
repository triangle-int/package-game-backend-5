import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetFcmTokenDto {
  @ApiProperty({ example: 'token', description: 'New token' })
  @IsString()
  fcmToken: string;
}
