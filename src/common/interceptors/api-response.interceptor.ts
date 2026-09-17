import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
}

interface ResponseObject {
  success?: boolean;
  message?: string;
  data?: unknown;
  meta?: unknown;
  [key: string]: unknown;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<unknown> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown> | T> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((payload) => {
        if (response.headersSent || response.statusCode === 204) {
          return payload;
        }

        return this.normalize(payload);
      }),
    );
  }

  private normalize(payload: unknown): ApiResponse<unknown> {
    if (this.isResponseObject(payload)) {
      if ('data' in payload) {
        return {
          success: payload.success ?? true,
          message: payload.message ?? 'Request successful',
          data: payload.data,
          ...(payload.meta !== undefined ? { meta: payload.meta } : {}),
        };
      }

      if ('message' in payload) {
        const { success, message, meta, ...data } = payload;

        return {
          success: success ?? true,
          message: String(message ?? 'Request successful'),
          data: Object.keys(data).length ? data : null,
          ...(meta !== undefined ? { meta } : {}),
        };
      }
    }

    return {
      success: true,
      message: 'Request successful',
      data: payload,
    };
  }

  private isResponseObject(payload: unknown): payload is ResponseObject {
    return Boolean(
      payload && typeof payload === 'object' && !Array.isArray(payload),
    );
  }
}
