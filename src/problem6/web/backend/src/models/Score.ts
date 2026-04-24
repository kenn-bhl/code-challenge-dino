import { getKnex } from "../../database/db.js";

export type UserScoreRow = {
  user_id: string;
  score: number;
  updated_at: Date;
};

const TABLE = "user_scores";

export class Score {
  static async getByUserId(userId: string): Promise<UserScoreRow | undefined> {
    return getKnex()<UserScoreRow>(TABLE).where({ user_id: userId }).first();
  }

  static async incrementBy(userId: string, delta: number): Promise<UserScoreRow> {
    const k = getKnex();
    await k(TABLE)
      .insert({
        user_id: userId,
        score: delta,
        updated_at: k.fn.now(),
      })
      .onConflict("user_id")
      .merge({
        score: k.raw(`${TABLE}.score + ?`, [delta]),
        updated_at: k.fn.now(),
      });

    const row = await Score.getByUserId(userId);
    if (!row) {
      throw new Error("Score.incrementBy: row not found after upsert");
    }
    return row;
  }

  static async top(limit: number): Promise<Array<{ user_id: string; username: string; score: number }>> {
    return getKnex()(TABLE)
      .join("users", "users.id", `${TABLE}.user_id`)
      .select(`${TABLE}.user_id`, "users.username", `${TABLE}.score`)
      .orderBy("score", "desc")
      .limit(limit);
  }
}
