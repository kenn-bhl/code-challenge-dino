/**
 * CLI (debug / runner): pass n as the first argument.
 *
 * Examples:
 *   npx tsx tasks/debug/run.ts 5
 *   npx tsx tasks/debug/run.ts 5 --repeat 500000
 *   npm start -- 5 -- --repeat 200000
 *
 * Note: after `npm start --`, use `--` again before flags so npm does not eat them:
 *   npm start -- 5 -- --repeat 200000
 */

import { performance } from "node:perf_hooks";
import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from "../../services/sum_to_n.js";

function parseArgs(argv: string[]): { nRaw: string | undefined; repeat: number; help: boolean } {
  let nRaw: string | undefined;
  let repeat = 1;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (arg === "--repeat" || arg === "-r") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        console.error("Missing value for --repeat / -r");
        process.exit(1);
      }
      repeat = Number(next);
      i++;
      if (!Number.isFinite(repeat) || repeat < 1 || !Number.isInteger(repeat)) {
        console.error(`Invalid repeat count: ${next}`);
        process.exit(1);
      }
      continue;
    }
    if (arg.startsWith("--repeat=")) {
      repeat = Number(arg.slice("--repeat=".length));
      if (!Number.isFinite(repeat) || repeat < 1 || !Number.isInteger(repeat)) {
        console.error(`Invalid repeat count: ${arg}`);
        process.exit(1);
      }
      continue;
    }
    if (!arg.startsWith("-")) {
      if (nRaw === undefined) {
        nRaw = arg;
      }
    }
  }

  return { nRaw, repeat, help };
}

function measure(
  iterations: number,
  fn: () => number,
): { result: number; totalMs: number } {
  let result = 0;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    result = fn();
  }
  const totalMs = performance.now() - t0;
  return { result, totalMs };
}

function main(): void {
  const { nRaw, repeat, help } = parseArgs(process.argv.slice(2));

  if (help) {
    console.log("Usage: npx tsx tasks/debug/run.ts <n> [--repeat <count>]");
    console.log("  n       — integer (e.g. 5 -> sum 1..5 = 15)");
    console.log("  --repeat, -r — run each implementation this many times (default 1)");
    console.log("               Use a large value (e.g. 500000) to compare fast O(1) vs loops.");
    process.exit(0);
  }

  if (nRaw === undefined) {
    console.error("Usage: npx tsx tasks/debug/run.ts <n> [--repeat <count>]");
    console.error("Try --help for details.");
    process.exit(1);
  }

  const n = Number(nRaw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    console.error(`Invalid integer: ${nRaw}`);
    process.exit(1);
  }

  const implementations: Array<{ name: string; fn: () => number }> = [
    { name: "sum_to_n_a", fn: () => sum_to_n_a(n) },
    { name: "sum_to_n_b", fn: () => sum_to_n_b(n) },
    { name: "sum_to_n_c", fn: () => sum_to_n_c(n) },
  ];

  console.log(`n = ${n}`);
  console.log(`repeat = ${repeat}`);
  console.log("---");

  for (const { name, fn } of implementations) {
    const { result, totalMs } = measure(repeat, fn);
    const avgUs = (totalMs / repeat) * 1000;
    console.log(`${name}(n) = ${result}`);
    console.log(
      `  [debug] total: ${totalMs.toFixed(3)} ms | avg per call: ${avgUs.toFixed(3)} µs`,
    );
  }
}

main();
