import "dotenv/config";
import { createApp } from "./app.js";
import { destroyKnex } from "../../database/db.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

/**
 * Gracefully stops the HTTP server and database client.
 *
 * @param signal - OS signal that triggered the shutdown routine.
 * @param closeServer - Callback that resolves when the HTTP server is closed.
 * @returns Promise that resolves after all resources are closed.
 * @behavior Logs shutdown events and terminates the process with exit code 0.
 */
async function shutdown(
  signal: string,
  closeServer: () => Promise<void>,
): Promise<void> {
  console.log(`${signal} received, shutting down...`);
  await closeServer();
  await destroyKnex();
  process.exit(0);
}

/**
 * Bootstraps and starts the HTTP API server.
 *
 * @returns Promise that resolves when signal listeners are attached.
 * @behavior Enforces API key presence in production, starts Express, and
 * registers SIGINT/SIGTERM handlers for graceful shutdown.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.API_KEY?.trim()) {
    console.error("Refusing to start: NODE_ENV=production requires API_KEY.");
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });

  const closeServer = async (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

  process.on("SIGINT", () => void shutdown("SIGINT", closeServer));
  process.on("SIGTERM", () => void shutdown("SIGTERM", closeServer));
}

/**
 * Entry-point invocation wrapper.
 *
 * @returns Promise<void>
 * @behavior Executes startup logic and exits with code 1 on unexpected errors.
 */
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
