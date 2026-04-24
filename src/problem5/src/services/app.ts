import express from "express";
import { resourcesRouter } from "./routes/resources.js";
import { requireApiKey } from "./middleware/requireApiKey.js";

/**
 * Creates and configures the Express application instance.
 *
 * @returns Configured Express app with middleware, routes, and error handler.
 * @behavior Adds JSON parser, health endpoint, API key protection for resource
 * routes, and a centralized 500 error envelope.
 */
export function createApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { ok: true }, message: "" });
  });

  app.use("/api/resources", requireApiKey, resourcesRouter());

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({
        success: false,
        data: {},
        message: "internal server error",
      });
    },
  );

  return app;
}
