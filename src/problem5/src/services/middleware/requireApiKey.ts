import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

/**
 * Extracts an API key from supported headers.
 *
 * @param xApiKey - Value of `X-API-Key` header (string or repeated values).
 * @param authorization - Value of `Authorization` header.
 * @returns API key string when present, otherwise `undefined`.
 * @behavior Prioritizes `X-API-Key`; falls back to `Bearer <token>` parsing.
 */
function getProvidedKey(
  xApiKey: string | string[] | undefined,
  authorization: string | undefined,
): string | undefined {
  if (typeof xApiKey === "string" && xApiKey.length > 0) {
    return xApiKey.trim();
  }
  if (Array.isArray(xApiKey) && xApiKey.length > 0 && typeof xApiKey[0] === "string") {
    return xApiKey[0].trim();
  }
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return undefined;
}

/**
 * Compares two secret values in constant time.
 *
 * @param expected - Expected API key from server configuration.
 * @param provided - API key provided by the client.
 * @returns `true` when keys match; otherwise `false`.
 * @behavior Uses `timingSafeEqual` and rejects different-length secrets early.
 */
function keysMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

let warnedMissingKey = false;

/**
 * Enforces API-key authentication for protected routes.
 *
 * @param req - Incoming Express request.
 * @param res - Express response used for 401 replies.
 * @param next - Express continuation callback.
 * @returns void.
 * @behavior
 * - If `API_KEY` is unset, allows requests (development mode) and logs once.
 * - If `API_KEY` is set, requires a matching key in headers.
 * - Returns a standardized 401 envelope for missing/invalid credentials.
 */
export const requireApiKey: RequestHandler = (req, res, next) => {
  const expected = process.env.API_KEY?.trim();
  if (!expected) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[requireApiKey] API_KEY is not set; /api/resources is not authenticated.",
      );
    }
    next();
    return;
  }

  const provided = getProvidedKey(req.headers["x-api-key"], req.headers.authorization);
  if (!provided || !keysMatch(expected, provided)) {
    res.status(401).json({ success: false, data: {}, message: "unauthorized" });
    return;
  }

  next();
};
