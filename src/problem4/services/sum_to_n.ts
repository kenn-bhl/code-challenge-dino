/**
 * Problem 4: three distinct implementations of summation-to-n.
 *
 * Convention:
 * - n > 0: sum of integers from 1 to n inclusive (e.g. n=5 -> 15).
 * - n === 0: 0.
 * - n < 0: sum of integers from n to -1 inclusive (e.g. n=-3 -> -6).
 *
 * Assumption: result always fits in Number.MAX_SAFE_INTEGER.
 */

/**
 * Iterative summation.
 *
 * Time: O(|n|) — one step per integer in the range.
 * Auxiliary space: O(1).
 */
export function sum_to_n_a(n: number): number {
  if (n === 0) {
    return 0;
  }
  let total = 0;
  if (n > 0) {
    for (let i = 1; i <= n; i++) {
      total += i;
    }
  } else {
    for (let i = n; i <= -1; i++) {
      total += i;
    }
  }
  return total;
}

/**
 * Closed-form arithmetic (Gauss formula for positive n; symmetric formula for negative n).
 *
 * Time: O(1).
 * Auxiliary space: O(1).
 * Most efficient: constant time and no iteration.
 */
export function sum_to_n_b(n: number): number {
  if (n === 0) {
    return 0;
  }
  if (n > 0) {
    return (n * (n + 1)) / 2;
  }
  const m = -n;
  return (-m * (m + 1)) / 2;
}

/**
 * Recursive summation (same mathematical cases as sum_to_n_a).
 *
 * Time: O(|n|) — one recursive call per step toward 0.
 * Auxiliary space: O(|n|) — call stack depth.
 * Less stack-efficient than iteration for large |n|, but illustrates the recursive structure.
 */
export function sum_to_n_c(n: number): number {
  if (n === 0) {
    return 0;
  }
  if (n > 0) {
    return n + sum_to_n_c(n - 1);
  }
  return n + sum_to_n_c(n + 1);
}
