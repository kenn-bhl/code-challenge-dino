import { getKnex } from "../../database/db.js";

export type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
};

const TABLE = "users";

export class User {
  static async create(input: {
    id: string;
    username: string;
    passwordHash: string;
  }): Promise<UserRow> {
    const rows = await getKnex()<UserRow>(TABLE)
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

  static async findByUsername(username: string): Promise<UserRow | undefined> {
    return getKnex()<UserRow>(TABLE).where({ username }).first();
  }

  static async findById(id: string): Promise<UserRow | undefined> {
    return getKnex()<UserRow>(TABLE).where({ id }).first();
  }
}
