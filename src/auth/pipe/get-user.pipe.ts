import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GetUserPipe implements PipeTransform {
  constructor(private prisma: PrismaService) {}

  async transform(value: any) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId: value.uid },
      include: { ban: true },
    });

    if (user == null) throw new NotFoundException('userNotFound');
    if (user.ban != null)
      throw new ForbiddenException({ message: 'banned', ban: user.ban });

    return user;
  }
}
