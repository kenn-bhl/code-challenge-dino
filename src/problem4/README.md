# Problem 4 - Sum to N (TypeScript)

This module implements three different `sum_to_n` strategies and a debug CLI runner
to compare correctness and execution time.

## Runtime Requirements

- Node.js 20+

## Project Structure

- `services/sum_to_n.ts` - three implementations:
  - `sum_to_n_a` (iterative)
  - `sum_to_n_b` (closed-form / O(1))
  - `sum_to_n_c` (recursive)
- `tasks/debug/run.ts` - CLI runner and micro-benchmark helper
- `plan.md` - planning notes

## Install and Run (Step by Step)

From `src/problem4`:

1. Install dependencies:

```bash
npm install
```

2. Run with one input value:

```bash
npm start -- 5
```

3. Run with benchmark repeats:

```bash
npm start -- 5 -- --repeat 500000
```

Notes:

- After `npm start --`, use another `--` before flags (`--repeat`) so npm does not consume them.
- You can also run directly:

```bash
npx tsx tasks/debug/run.ts 5 --repeat 500000
```

## Input and Output Contract

Input:

- `n`: required integer
- `--repeat` / `-r`: optional positive integer (default `1`)

Output:

- Prints result for each implementation
- Prints timing diagnostics:
  - total execution time in ms
  - average time per call in microseconds

Example output:

```text
n = 5
repeat = 500000
---
sum_to_n_a(n) = 15
  [debug] total: 2.236 ms | avg per call: 0.004 µs
sum_to_n_b(n) = 15
  [debug] total: 2.708 ms | avg per call: 0.005 µs
sum_to_n_c(n) = 15
  [debug] total: 6.916 ms | avg per call: 0.014 µs
```

## Mathematical Convention

Implemented behavior:

- `n > 0`: sum from `1..n`
- `n === 0`: returns `0`
- `n < 0`: sum from `n..-1`

Examples:

- `n = 5` -> `15`
- `n = 0` -> `0`
- `n = -3` -> `-6`

## Complexity Summary

- `sum_to_n_a`: `O(|n|)` time, `O(1)` space
- `sum_to_n_b`: `O(1)` time, `O(1)` space
- `sum_to_n_c`: `O(|n|)` time, `O(|n|)` stack space

## Troubleshooting

- Error: `Cannot find name 'process'`
  - Ensure dependencies are installed in `src/problem4`
  - Ensure TypeScript config includes Node types (`types: ["node"]`)

