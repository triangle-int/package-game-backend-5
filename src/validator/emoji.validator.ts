import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import emojiRegex from 'emoji-regex';

@ValidatorConstraint({ name: 'isEmoji', async: false })
@Injectable()
export class IsEmoji implements ValidatorConstraintInterface {
  validate(text: string): boolean {
    if (text == null) {
      return false;
    }
    const regex = emojiRegex();
    const matches = text.match(regex);
    if (matches === null) {
      return false;
    }
    return matches.join('') === text;
  }

  defaultMessage(): string {
    return '$property must be an emoji';
  }
}
