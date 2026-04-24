import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { User } from "../models/User.js";
/**
 * Normalizes username before persistence or lookup.
 *
 * @param username - Raw username input.
 * @returns Lowercased and trimmed username.
 */
function normalizeUsername(username) {
    return username.trim().toLowerCase();
}
/**
 * Hashes a plain-text password using scrypt.
 *
 * @param password - Plain-text password.
 * @returns Hex-encoded password hash.
 */
function hashPassword(password) {
    return scryptSync(password, "problem6-salt", 64).toString("hex");
}
/**
 * Compares two secret strings in constant time.
 *
 * @param a - First secret value.
 * @param b - Second secret value.
 * @returns `true` when both values are equal.
 */
function safeCompare(a, b) {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) {
        return false;
    }
    return timingSafeEqual(ba, bb);
}
/**
 * Validates username format and length.
 *
 * @param username - Username candidate from request.
 * @returns Validation error text, or `null` when valid.
 */
export function validateUsername(username) {
    if (username.trim().length < 3) {
        return "username must be at least 3 characters";
    }
    if (!/^[a-zA-Z0-9_\-.]+$/.test(username.trim())) {
        return "username contains invalid characters";
    }
    return null;
}
/**
 * Validates password strength rules.
 *
 * @param password - Password candidate from request.
 * @returns Validation error text, or `null` when valid.
 */
export function validatePassword(password) {
    if (password.length < 8) {
        return "password must be at least 8 characters";
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return "password must include letters and numbers";
    }
    return null;
}
/**
 * Maps database user row into public API shape.
 *
 * @param row - User row from persistence layer.
 * @returns Public user object for API responses.
 */
function toPublic(row) {
    return {
        id: row.id,
        username: row.username,
        createdAt: row.created_at.toISOString(),
    };
}
/**
 * Creates one user account after validation checks.
 *
 * @param username - Requested username.
 * @param password - Plain-text password.
 * @returns Result object containing created user or failure reason.
 * @behavior Normalizes username, enforces uniqueness, and stores hashed password.
 */
export async function createUser(username, password) {
    const usernameErr = validateUsername(username);
    if (usernameErr) {
        return { ok: false, reason: usernameErr };
    }
    const passErr = validatePassword(password);
    if (passErr) {
        return { ok: false, reason: passErr };
    }
    const normalized = normalizeUsername(username);
    const existing = await User.findByUsername(normalized);
    if (existing) {
        return { ok: false, reason: "username already exists" };
    }
    const user = await User.create({
        id: randomUUID(),
        username: normalized,
        passwordHash: hashPassword(password),
    });
    return { ok: true, user: toPublic(user) };
}
/**
 * Authenticates one user by username/password.
 *
 * @param username - Username credential.
 * @param password - Plain-text password credential.
 * @returns Public user payload on success, otherwise `null`.
 */
export async function authenticateUser(username, password) {
    const normalized = normalizeUsername(username);
    const user = await User.findByUsername(normalized);
    if (!user) {
        return null;
    }
    const hashed = hashPassword(password);
    if (!safeCompare(user.password_hash, hashed)) {
        return null;
    }
    return toPublic(user);
}
/**
 * Loads user by identifier in public response shape.
 *
 * @param userId - User identifier.
 * @returns Public user payload or `undefined` when missing.
 */
export async function getUserById(userId) {
    const row = await User.findById(userId);
    return row ? toPublic(row) : undefined;
}
//# sourceMappingURL=userService.js.map