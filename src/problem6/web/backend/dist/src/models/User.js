import { getKnex } from "../../database/db.js";
const TABLE = "users";
export class User {
    static async create(input) {
        const rows = await getKnex()(TABLE)
            .insert({
            id: input.id,
            username: input.username,
            password_hash: input.passwordHash,
        })
            .returning("*");
        const row = rows[0];
        if (!row) {
            throw new Error("User.create: insert returned no row");
        }
        return row;
    }
    static async findByUsername(username) {
        return getKnex()(TABLE).where({ username }).first();
    }
    static async findById(id) {
        return getKnex()(TABLE).where({ id }).first();
    }
}
//# sourceMappingURL=User.js.map