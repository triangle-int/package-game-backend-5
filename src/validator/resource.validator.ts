import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import gameConfig from '../game-config/game-config.json';

@ValidatorConstraint({ name: 'isResource', async: false })
export class IsResource implements ValidatorConstraintInterface {
  validate(value: any): boolean | Promise<boolean> {
    return gameConfig.items.find(({ name }) => name === value) != undefined;
  }

  defaultMessage?(): string {
    return '$property must be real resource';
  }
}
