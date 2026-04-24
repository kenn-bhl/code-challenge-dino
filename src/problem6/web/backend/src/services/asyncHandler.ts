import type { Request, RequestHandler, Response } from "express";

type AsyncRoute = (req: Request, res: Response) => Promise<void>;

export function asyncHandler(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}
