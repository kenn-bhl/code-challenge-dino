import { getKnex } from "../../database/db.js";

export type AppliedActionRow = {
  action_id: string;
  user_id: string;
  delta: number;
  status: "pending" | "success" | "expired";
  expires_at: Date;
  created_at: Date;
};

const TABLE = "applied_actions";

export class AppliedAction {
  static async createPending(input: {
    actionId: string;
    userId: string;
    delta: number;
    expiresAt: Date;
  }): Promise<AppliedActionRow> {
    const rows = await getKnex()<AppliedActionRow>(TABLE)
      .insert({
        action_id: input.actionId,
        user_id: input.userId,
        delta: input.delta,
        status: "pending",
        expires_at: input.expiresAt,
      })
      .returning("*");
    const row = rows[0];
    if (!row) {
      throw new Error("AppliedAction.createPending: insert returned no row");
    }
    return row;
  }

  static async findPendingByUser(userId: string): Promise<AppliedActionRow | undefined> {
    return getKnex()<AppliedActionRow>(TABLE)
      .where({ user_id: userId, status: "pending" })
      .orderBy("created_at", "desc")
      .first();
  }

  static async findLatestByUser(userId: string): Promise<AppliedActionRow | undefined> {
    return getKnex()<AppliedActionRow>(TABLE)
      .where({ user_id: userId })
      .orderBy("created_at", "desc")
      .first();
  }

  static async countCreatedSince(userId: string, since: Date): Promise<number> {
    const row = await getKnex()(TABLE)
      .where({ user_id: userId })
      .andWhere("created_at", ">=", since)
      .count<{ count: string }>("* as count")
      .first();
    return Number.parseInt(row?.count ?? "0", 10);
  }

  static async findByActionIdForUser(
    userId: string,
    actionId: string,
  ): Promise<AppliedActionRow | undefined> {
    return getKnex()<AppliedActionRow>(TABLE)
      .where({ user_id: userId, action_id: actionId })
      .first();
  }

  static async markExpired(actionId: string): Promise<number> {
    return getKnex()(TABLE).where({ action_id: actionId }).update({ status: "expired" });
  }

  static async markSuccess(actionId: string): Promise<number> {
    return getKnex()(TABLE).where({ action_id: actionId }).update({ status: "success" });
  }
}
