import "dotenv/config";
import express from "express";
import { scoreboardRouter } from "./routes/scoreboard.js";
import { requireSessionToken } from "./middleware/security.js";
import { fail, ok } from "./types.js";
import { seedDemoData } from "./services/scoreService.js";
import { authRouter } from "./routes/auth.js";
import { destroyKnex } from "../database/db.js";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const corsOrigin = process.env.CORS_ORIGIN?.trim();

/**
 * Creates and configures the backend Express application.
 *
 * @returns Configured Express app instance.
 * @behavior Registers CORS headers, JSON parser, routes, and global error handler.
 */
function createApp(): express.Express {
  const app = express();

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", corsOrigin ?? "");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json(ok({ ok: true }));
  });

  app.use("/api/v1", authRouter());
  app.use("/api/v1", requireSessionToken, scoreboardRouter());

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json(fail("internal server error"));
    },
  );

  return app;
}

/**
 * Application entrypoint.
 *
 * @returns Promise resolved after server startup handlers are attached.
 * @behavior Validates required env vars, starts HTTP server, and wires graceful shutdown.
 */
async function main(): Promise<void> {
  const requiredEnvKeys = [
    "CORS_ORIGIN",
    "ACTION_EXPIRY_SECONDS",
    "ACTION_RATE_WINDOW_MINUTES",
    "ACTION_RATE_MAX_REQUESTS",
    "ACTION_START_COOLDOWN_SECONDS",
  ];
  for (const key of requiredEnvKeys) {
    if (!process.env[key]?.trim()) {
      throw new Error(`${key} is required`);
    }
  }

  if (!corsOrigin) {
    throw new Error("CORS_ORIGIN is required");
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.DATABASE_URL?.trim()) {
      throw new Error("DATABASE_URL is required in production");
    }
  }

  await seedDemoData();
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received, shutting down...`);
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await destroyKnex();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
