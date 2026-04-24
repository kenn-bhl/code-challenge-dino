/**
 * Builds the full health-check URL from optional BASE_URL env.
 *
 * @returns Absolute URL to the `/health` endpoint.
 * @behavior Trims any trailing slash from BASE_URL to avoid `//health`.
 */
function buildHealthUrl(): string {
  const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  return `${base}/health`;
}

/**
 * Executes a simple health-check request against the running API server.
 *
 * @returns Promise that resolves when output is printed.
 * @behavior Prints status/body and exits with code 1 when endpoint is not successful.
 */
async function main(): Promise<void> {
  const url = buildHealthUrl();
  const res = await fetch(url);
  const text = await res.text();
  console.log(res.status, text);

  if (!res.ok) {
    process.exit(1);
  }
}

/**
 * Script entry-point wrapper.
 *
 * @returns Promise<void>
 * @behavior Exits with code 1 for unexpected runtime failures.
 */
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
