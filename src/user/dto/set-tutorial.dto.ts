import { IsString } from 'class-validator';

export class SetTutorialDto {
  @IsString()
  tutorial: string;
}
