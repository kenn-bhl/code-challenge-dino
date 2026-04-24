import type { Request, RequestHandler, Response } from "express";

type AsyncRoute = (req: Request, res: Response) => Promise<void>;

/**
 * Wraps an async route and forwards rejected promises to Express error middleware.
 *
 * @param handler - Async route handler that returns a Promise.
 * @returns Express-compatible request handler.
 * @behavior Prevents unhandled promise rejections by calling `next(error)`.
 */
export function asyncHandler(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}
