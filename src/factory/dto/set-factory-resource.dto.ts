import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Validate } from 'class-validator';
import { IsResource } from '../../validator/resource.validator';

export class SetFactoryResourceDto {
  @ApiProperty({ example: 'wheel', description: 'Factory resource' })
  @IsString()
  @Validate(IsResource)
  resource: string;

  @ApiProperty({ example: 0, description: 'Factory ID' })
  @IsNumber()
  factoryId: number;
}
