import { Router } from "express";
import { completeMission, getTopLeaderboard, startMission } from "../services/scoreService.js";
import { broadcastLeaderboard, registerSseClient, unregisterSseClient, } from "../realtime/hub.js";
import { fail, ok } from "../types.js";
import { asyncHandler } from "../services/asyncHandler.js";
/**
 * Parses and bounds leaderboard limit from query string.
 *
 * @param req - Express request carrying query parameters.
 * @returns Safe limit between 1 and 100.
 * @behavior Falls back to 10 when query value is absent or invalid.
 */
function parseLimit(req) {
    const raw = req.query.limit;
    if (typeof raw !== "string") {
        return 10;
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) {
        return 10;
    }
    return Math.max(1, Math.min(100, n));
}
/**
 * Returns current leaderboard snapshot.
 *
 * @param req - Express request with optional `limit` query.
 * @param res - Express response used to return leaderboard data.
 * @returns Promise resolved after response is sent.
 * @behavior Reads top scores from service and includes pagination metadata.
 */
async function handleGetLeaderboard(req, res) {
    const limit = parseLimit(req);
    const items = await getTopLeaderboard(limit);
    res.json(ok({
        items,
        pagination: {
            total: items.length,
            limit,
            offset: 0,
            page: 1,
            hasMore: false,
        },
    }));
}
/**
 * Starts a new mission for the authenticated user.
 *
 * @param _req - Express request (user identity is provided via middleware).
 * @param res - Express response used for success or rate/cooldown errors.
 * @returns Promise resolved after response is sent.
 * @behavior Enforces mission guards in service and returns `actionId` with `expiresAt`.
 */
async function handleStartMission(_req, res) {
    const userId = res.locals.authUserId;
    const result = await startMission(userId);
    if (!result.ok) {
        const status = result.code === "MISSION_PENDING" ? 409 : 429;
        res.status(status).json(fail(result.reason, { code: result.code }));
        return;
    }
    res.status(201).json(ok({
        actionId: result.actionId,
        expiresAt: result.expiresAt,
    }, "mission started"));
}
/**
 * Completes an existing mission for the authenticated user.
 *
 * @param req - Express request containing `actionId`.
 * @param res - Express response used for success or mission failure errors.
 * @returns Promise resolved after response is sent.
 * @behavior Validates mission state, applies score, and broadcasts leaderboard updates.
 */
async function handleCompleteMission(req, res) {
    const body = req.body;
    if (!body.actionId || typeof body.actionId !== "string") {
        res.status(400).json(fail("Mission Failed"));
        return;
    }
    const userId = res.locals.authUserId;
    const result = await completeMission(userId, body.actionId);
    if (!result.applied) {
        res.status(400).json(fail("Mission Failed"));
        return;
    }
    const leaderboard = await getTopLeaderboard(10);
    broadcastLeaderboard(ok({ items: leaderboard }, "leaderboard updated"));
    res.status(200).json(ok({
        applied: true,
        actionId: body.actionId,
        score: result.score,
    }, "mission completed"));
}
/**
 * Compatibility endpoint for legacy `/actions/complete` clients.
 *
 * @param req - Express request containing mission `actionId`.
 * @param res - Express response used for mission completion result.
 * @returns Promise resolved after response is sent.
 * @behavior Delegates to mission completion logic while preserving old route path.
 */
async function handleCompleteAction(req, res) {
    const body = req.body;
    if (!body.actionId || typeof body.actionId !== "string") {
        res.status(400).json(fail("actionId is required"));
        return;
    }
    const userId = res.locals.authUserId;
    const result = await completeMission(userId, body.actionId);
    if (!result.applied) {
        res.status(400).json(fail("Mission Failed"));
        return;
    }
    const leaderboard = await getTopLeaderboard(10);
    broadcastLeaderboard(ok({ items: leaderboard }, "leaderboard updated"));
    res.status(200).json(ok({ applied: true, actionId: body.actionId, score: result.score }, "mission completed"));
}
/**
 * Opens and manages an SSE connection for leaderboard updates.
 *
 * @param _req - Express request for SSE stream.
 * @param res - Express response stream object.
 * @returns void.
 * @behavior Registers client, emits heartbeat events, and cleans up on disconnect.
 */
function handleLeaderboardStream(_req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    registerSseClient(res);
    res.write(`event: connected\ndata: ${JSON.stringify(ok({ connected: true }))}\n\n`);
    const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\ndata: ${JSON.stringify(ok({ now: Date.now() }))}\n\n`);
    }, 15000);
    res.on("close", () => {
        clearInterval(heartbeat);
        unregisterSseClient(res);
    });
}
/**
 * Builds and returns the scoreboard router.
 *
 * @returns Configured router with leaderboard, mission, and SSE routes.
 * @behavior Registers mission start/complete handlers and a legacy compatibility route.
 */
export function scoreboardRouter() {
    const r = Router();
    r.route("/leaderboard").get(asyncHandler(handleGetLeaderboard));
    r.route("/missions/start").post(asyncHandler(handleStartMission));
    r.route("/missions/complete").post(asyncHandler(handleCompleteMission));
    // Backward-compatible alias for older clients.
    r.route("/actions/complete").post(asyncHandler(handleCompleteAction));
    r.route("/leaderboard/stream").get(handleLeaderboardStream);
    return r;
}
//# sourceMappingURL=scoreboard.js.map