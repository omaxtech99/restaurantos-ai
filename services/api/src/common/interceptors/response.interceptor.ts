import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { createSuccessResponse } from '@restaurantos/shared';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          typeof (data as { success: unknown }).success === 'boolean'
        ) {
          return data;
        }
        return createSuccessResponse(data ?? null);
      }),
    );
  }
}
