/**
 * Knex CLI config. Load `.env` from `src/problem5` (run commands from that directory).
 *
 * Examples:
 *   npm run migrate:latest
 *   npm run migrate:make -- add_column_to_resources
 */
import "dotenv/config";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  throw new Error("DATABASE_URL is required for knexfile.mjs");
}

const connection =
  url.includes("sslmode=disable") || /localhost|127\.0\.0\.1/.test(url)
    ? { connectionString: url, ssl: false }
    : url;

/** @type {import("knex").Knex.Config} */
export default {
  client: "pg",
  connection,
  pool: { min: 0, max: 10 },
  migrations: {
    directory: "./database/migrations",
    extension: "mjs",
    // Required: Knex default loadExtensions omits ".mjs", so migrations would be invisible.
    loadExtensions: [".mjs"],
  },
};
