import { getKnex } from "../../database/db.js";
const TABLE = "applied_actions";
export class AppliedAction {
    static async createPending(input) {
        const rows = await getKnex()(TABLE)
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
    static async findPendingByUser(userId) {
        return getKnex()(TABLE)
            .where({ user_id: userId, status: "pending" })
            .orderBy("created_at", "desc")
            .first();
    }
    static async findLatestByUser(userId) {
        return getKnex()(TABLE)
            .where({ user_id: userId })
            .orderBy("created_at", "desc")
            .first();
    }
    static async countCreatedSince(userId, since) {
        const row = await getKnex()(TABLE)
            .where({ user_id: userId })
            .andWhere("created_at", ">=", since)
            .count("* as count")
            .first();
        return Number.parseInt(row?.count ?? "0", 10);
    }
    static async findByActionIdForUser(userId, actionId) {
        return getKnex()(TABLE)
            .where({ user_id: userId, action_id: actionId })
            .first();
    }
    static async markExpired(actionId) {
        return getKnex()(TABLE).where({ action_id: actionId }).update({ status: "expired" });
    }
    static async markSuccess(actionId) {
        return getKnex()(TABLE).where({ action_id: actionId }).update({ status: "success" });
    }
}
//# sourceMappingURL=AppliedAction.js.map