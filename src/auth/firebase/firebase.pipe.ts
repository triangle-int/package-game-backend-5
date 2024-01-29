import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FirebasePipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: any) {
    const user = await this.prisma.user.findUnique({
      where: {
        firebaseId: value.uid,
      },
    });

    if (user == null) {
      // TODO : Move errors to some place
      throw new NotFoundException('userNotFound');
    }

    return user;
  }
}
