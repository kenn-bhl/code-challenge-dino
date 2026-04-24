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
    loadExtensions: [".mjs"],
  },
};
