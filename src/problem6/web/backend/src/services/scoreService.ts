import type { LeaderboardItem } from "../types.js";
import { AppliedAction } from "../models/AppliedAction.js";
import { Score } from "../models/Score.js";
import { randomUUID } from "node:crypto";

/**
 * Parses a required positive integer from environment variables.
 *
 * @param name - Environment variable name.
 * @returns Parsed positive integer value.
 * @behavior Throws when the variable is missing, invalid, or less than 1.
 */
function parseRequiredPositiveInt(name: string): number {
  const raw = process.env[name]?.trim();
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

const ACTION_EXPIRY_SECONDS = parseRequiredPositiveInt("ACTION_EXPIRY_SECONDS");
const ACTION_RATE_WINDOW_MINUTES = parseRequiredPositiveInt("ACTION_RATE_WINDOW_MINUTES");
const ACTION_RATE_MAX_REQUESTS = parseRequiredPositiveInt("ACTION_RATE_MAX_REQUESTS");
const ACTION_START_COOLDOWN_SECONDS = parseRequiredPositiveInt("ACTION_START_COOLDOWN_SECONDS");

/**
 * Returns top leaderboard items ordered by score.
 *
 * @param limit - Maximum number of rows to return.
 * @returns Promise of ordered leaderboard entries.
 * @behavior Clamps `limit` into the safe range [1, 100].
 */
export async function getTopLeaderboard(limit = 10): Promise<LeaderboardItem[]> {
  const normalized = Math.max(1, Math.min(100, limit));
  const rows = await Score.top(normalized);
  return rows.map((row, idx) => ({
    rank: idx + 1,
    username: row.username,
    score: row.score,
  }));
}

/**
 * Starts one mission for a specific user.
 *
 * @param userId - Authenticated user identifier.
 * @returns Success payload with action id and expiration, or failure reason/code.
 * @behavior Enforces single pending mission, cooldown, rate limit, and server-side expiry.
 */
export async function startMission(userId: string): Promise<
  | { ok: true; actionId: string; expiresAt: string }
  | { ok: false; reason: string; code: string }
> {
  const now = new Date();
  const pending = await AppliedAction.findPendingByUser(userId);
  if (pending) {
    if (pending.expires_at.getTime() > now.getTime()) {
      return { ok: false, reason: "mission already in progress", code: "MISSION_PENDING" };
    }
    await AppliedAction.markExpired(pending.action_id);
  }

  const latest = await AppliedAction.findLatestByUser(userId);
  if (
    latest &&
    now.getTime() - latest.created_at.getTime() < ACTION_START_COOLDOWN_SECONDS * 1000
  ) {
    return { ok: false, reason: "mission start cooldown active", code: "MISSION_COOLDOWN" };
  }

  const windowStart = new Date(now.getTime() - ACTION_RATE_WINDOW_MINUTES * 60 * 1000);
  const requests = await AppliedAction.countCreatedSince(userId, windowStart);
  if (requests >= ACTION_RATE_MAX_REQUESTS) {
    return { ok: false, reason: "mission start rate limit exceeded", code: "MISSION_RATE_LIMIT" };
  }

  const actionId = randomUUID();
  const expiresAt = new Date(now.getTime() + ACTION_EXPIRY_SECONDS * 1000);
  await AppliedAction.createPending({ actionId, userId, delta: 10, expiresAt });
  return { ok: true, actionId, expiresAt: expiresAt.toISOString() };
}

/**
 * Completes a mission and applies score when valid.
 *
 * @param userId - Authenticated user identifier.
 * @param actionId - Mission action identifier created during start.
 * @returns Completion result including whether score was applied and current score.
 * @behavior Rejects missing/expired/non-pending missions and updates mission status transitions.
 */
export async function completeMission(
  userId: string,
  actionId: string,
): Promise<{ applied: boolean; score: number }> {
  const action = await AppliedAction.findByActionIdForUser(userId, actionId);
  if (!action || action.status !== "pending") {
    return { applied: false, score: (await Score.getByUserId(userId))?.score ?? 0 };
  }

  const now = Date.now();
  if (action.expires_at.getTime() <= now) {
    await AppliedAction.markExpired(action.action_id);
    return { applied: false, score: (await Score.getByUserId(userId))?.score ?? 0 };
  }

  await AppliedAction.markSuccess(action.action_id);
  const scoreRow = await Score.incrementBy(userId, action.delta);
  return { applied: true, score: scoreRow.score };
}

/**
 * Seeds demo data if needed at startup.
 *
 * @returns Promise resolved after seeding attempt.
 * @behavior Currently a no-op because database mode starts without demo inserts.
 */
export async function seedDemoData(): Promise<void> {
  // No-op for database mode. Keep function for startup compatibility.
}
