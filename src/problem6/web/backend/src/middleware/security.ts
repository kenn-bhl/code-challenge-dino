import type { Request, RequestHandler } from "express";
import { fail } from "../types.js";
import { getSessionByToken } from "../services/sessionService.js";
import { getUserById } from "../services/userService.js";

/**
 * Extracts a session token from supported request locations.
 *
 * @param req - Express request object.
 * @returns Session token or `undefined` when missing.
 * @behavior Accepts `Authorization: Bearer` and SSE query parameter `t`.
 */
function getToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }

  const queryToken = req.query.t;
  if (typeof queryToken === "string" && queryToken.length > 0) {
    return queryToken.trim();
  }

  return undefined;
}

/**
 * Ensures requests include a valid session token.
 *
 * @param req - Incoming request.
 * @param res - Response used for unauthorized replies.
 * @param next - Express next middleware callback.
 * @returns void.
 * @behavior Resolves session and user, then stores auth context in `res.locals`.
 */
export const requireSessionToken: RequestHandler = (req, res, next) => {
  void (async () => {
    const token = getToken(req);
    if (!token) {
      res.status(401).json(fail("unauthorized"));
      return;
    }

    const session = await getSessionByToken(token);
    if (!session) {
      res.status(401).json(fail("unauthorized"));
      return;
    }

    const user = await getUserById(session.userId);
    if (!user) {
      res.status(401).json(fail("unauthorized"));
      return;
    }

    res.locals.authUserId = user.id;
    res.locals.authToken = token;
    next();
  })().catch(next);
};
