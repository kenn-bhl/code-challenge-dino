import { randomBytes } from "node:crypto";
import { Session } from "../models/Session.js";

type SessionRow = {
  token: string;
  userId: string;
  createdAt: string;
};

export async function createSession(userId: string): Promise<SessionRow> {
  const token = randomBytes(32).toString("base64url");
  const row = await Session.create({ token, userId });
  return { token: row.token, userId: row.user_id, createdAt: row.created_at.toISOString() };
}

export async function getSessionByToken(token: string): Promise<SessionRow | undefined> {
  const row = await Session.findByToken(token);
  if (!row) {
    return undefined;
  }
  return { token: row.token, userId: row.user_id, createdAt: row.created_at.toISOString() };
}

export async function destroySession(token: string): Promise<boolean> {
  const deleted = await Session.deleteByToken(token);
  return deleted > 0;
}
