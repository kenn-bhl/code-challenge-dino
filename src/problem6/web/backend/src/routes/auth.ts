import { Router, type Request, type Response } from "express";
import { authenticateUser, createUser, validatePassword, validateUsername } from "../services/userService.js";
import { createSession, destroySession } from "../services/sessionService.js";
import { fail, ok, type LoginInput, type RegisterInput } from "../types.js";
import { requireSessionToken } from "../middleware/security.js";
import { asyncHandler } from "../services/asyncHandler.js";

/**
 * Handles user registration requests.
 *
 * @param req - Express request containing username and password.
 * @param res - Express response used for success or validation errors.
 * @returns Promise resolved after the response is written.
 * @behavior Validates payload fields, creates a user, and returns HTTP 201.
 */
async function handleRegister(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<RegisterInput>;

  if (typeof body.username !== "string") {
    res.status(400).json(fail("username is required"));
    return;
  }
  if (typeof body.password !== "string") {
    res.status(400).json(fail("password is required"));
    return;
  }

  const usernameErr = validateUsername(body.username);
  if (usernameErr) {
    res.status(400).json(fail(usernameErr));
    return;
  }

  const passwordErr = validatePassword(body.password);
  if (passwordErr) {
    res.status(400).json(fail(passwordErr));
    return;
  }

  const created = await createUser(body.username, body.password);
  if (!created.ok) {
    res.status(409).json(fail(created.reason));
    return;
  }

  res.status(201).json(
    ok(
      {
        user: {
          id: created.user.id,
          username: created.user.username,
          createdAt: created.user.createdAt,
        },
      },
      "user registered",
    ),
  );
}

/**
 * Handles user login requests.
 *
 * @param req - Express request containing username and password.
 * @param res - Express response used for success or auth errors.
 * @returns Promise resolved after the response is written.
 * @behavior Verifies credentials, creates a session token, and returns HTTP 200.
 */
async function handleLogin(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<LoginInput>;

  if (typeof body.username !== "string" || typeof body.password !== "string") {
    res.status(400).json(fail("username and password are required"));
    return;
  }

  const user = await authenticateUser(body.username, body.password);
  if (!user) {
    res.status(401).json(fail("invalid credentials"));
    return;
  }

  const session = await createSession(user.id);
  res.status(200).json(
    ok(
      {
        token: session.token,
        user: {
          id: user.id,
          username: user.username,
        },
      },
      "login successful",
    ),
  );
}

/**
 * Handles user logout requests.
 *
 * @param _req - Express request (unused, auth context comes from middleware).
 * @param res - Express response used for logout result.
 * @returns Promise resolved after the response is written.
 * @behavior Deletes current session token and returns logout status.
 */
async function handleLogout(_req: Request, res: Response): Promise<void> {
  const token = res.locals.authToken as string;
  const removed = await destroySession(token);
  res.status(200).json(ok({ loggedOut: removed }, "logout successful"));
}

/**
 * Builds and returns the authentication router.
 *
 * @returns Configured Express router for register, login, and logout endpoints.
 * @behavior Binds auth handlers and protects logout with session middleware.
 */
export function authRouter(): Router {
  const r = Router();

  r.route("/auth/register").post(asyncHandler(handleRegister));
  r.route("/auth/login").post(asyncHandler(handleLogin));
  r.route("/auth/logout").post(requireSessionToken, asyncHandler(handleLogout));

  return r;
}
