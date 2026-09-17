import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) return;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.getPayload(exception);
    const message = this.getMessage(payload, exception, status);

    if (status >= 500) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      message,
      error: payload.error ?? HttpStatus[status] ?? 'Error',
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getPayload(exception: unknown): ErrorPayload {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          message: response,
          error: exception.name,
          statusCode: exception.getStatus(),
        };
      }

      if (response && typeof response === 'object') {
        return response as ErrorPayload;
      }
    }

    if (exception instanceof Error) {
      return { message: exception.message, error: exception.name };
    }

    return { message: 'Internal server error', error: 'Error' };
  }

  private getMessage(
    payload: ErrorPayload,
    exception: unknown,
    status: number,
  ) {
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    if (payload.message) return payload.message;
    if (exception instanceof Error && exception.message) {
      return exception.message;
    }

    return status === 500 ? 'Internal server error' : 'Request failed';
  }
}
