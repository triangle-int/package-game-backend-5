import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

export function bigintToString(data: any) {
  if (typeof data === 'bigint') return data.toString();
  if (typeof data !== 'object') return data;

  for (const key in data) {
    data[key] = bigintToString(data[key]);
  }

  return data;
}

export class BigIntInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) return data.map(bigintToString);
        return bigintToString(data);
      }),
    );
  }
}
