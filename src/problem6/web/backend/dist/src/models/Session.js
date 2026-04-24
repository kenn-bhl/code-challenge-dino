import { getKnex } from "../../database/db.js";
const TABLE = "sessions";
export class Session {
    static async create(input) {
        const rows = await getKnex()(TABLE)
            .insert({
            token: input.token,
            user_id: input.userId,
        })
            .returning("*");
        const row = rows[0];
        if (!row) {
            throw new Error("Session.create: insert returned no row");
        }
        return row;
    }
    static async findByToken(token) {
        return getKnex()(TABLE).where({ token }).first();
    }
    static async deleteByToken(token) {
        return getKnex()(TABLE).where({ token }).delete();
    }
}
//# sourceMappingURL=Session.js.map