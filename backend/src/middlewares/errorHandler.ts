import type { Request, Response, NextFunction } from 'express';
import { createError } from '../helpers/response';
import { resolveHttpMessage, resolveHttpStatus } from '../utils/httpErrors';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const status = resolveHttpStatus(err);
  const rawMessage = resolveHttpMessage(err);
  const isProduction = process.env.NODE_ENV === 'production';

  // Never expose internal details to clients in production; keep requestId for support.
  const message = status >= 500 && isProduction ? 'Server error' : rawMessage;

  if (status >= 500) {
    logger.error('Unhandled server error', err, {
      requestId: req.requestId ?? null,
      path: req.originalUrl,
      method: req.method
    });
  } else if (status >= 400) {
    logger.warn('Request rejected', {
      requestId: req.requestId ?? null,
      path: req.originalUrl,
      method: req.method,
      status,
      message: rawMessage
    });
  }

  res.status(status).json({ ...createError(message), requestId: req.requestId ?? null });
}
