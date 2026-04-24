import { getKnex } from "../../database/db.js";

export type SessionRow = {
  token: string;
  user_id: string;
  created_at: Date;
};

const TABLE = "sessions";

export class Session {
  static async create(input: { token: string; userId: string }): Promise<SessionRow> {
    const rows = await getKnex()<SessionRow>(TABLE)
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

  static async findByToken(token: string): Promise<SessionRow | undefined> {
    return getKnex()<SessionRow>(TABLE).where({ token }).first();
  }

  static async deleteByToken(token: string): Promise<number> {
    return getKnex()(TABLE).where({ token }).delete();
  }
}
