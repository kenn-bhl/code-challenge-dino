import knex, { type Knex } from "knex";

let instance: Knex | null = null;

/**
 * Builds Knex PostgreSQL connection configuration from environment variables.
 *
 * @returns Connection string or pg config object.
 * @behavior
 * - Throws when `DATABASE_URL` is missing/empty.
 * - Disables SSL automatically for local URLs using `sslmode=disable` or localhost.
 */
function connectionConfig(): string | Knex.PgConnectionConfig {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set or empty");
  }

  if (url.includes("sslmode=disable") || /localhost|127\.0\.0\.1/.test(url)) {
    return { connectionString: url, ssl: false };
  }

  return url;
}

/**
 * Returns a singleton Knex instance.
 *
 * @returns Initialized Knex client.
 * @behavior Lazily instantiates Knex on first call, then reuses the same instance.
 */
export function getKnex(): Knex {
  if (!instance) {
    instance = knex({
      client: "pg",
      connection: connectionConfig(),
      pool: { min: 0, max: 10 },
    });
  }
  return instance;
}

/**
 * Destroys the current Knex instance if it exists.
 *
 * @returns Promise that resolves once all DB connections are closed.
 * @behavior Safe to call multiple times; no-op when instance is not initialized.
 */
export async function destroyKnex(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}
