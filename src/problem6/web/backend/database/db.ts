import knex, { type Knex } from "knex";

let instance: Knex | null = null;

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

export async function destroyKnex(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}
