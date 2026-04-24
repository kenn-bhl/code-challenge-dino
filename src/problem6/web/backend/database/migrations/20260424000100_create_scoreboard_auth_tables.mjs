/**
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary();
    t.string("username", 128).notNullable().unique();
    t.string("password_hash", 256).notNullable();
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("sessions", (t) => {
    t.string("token", 256).primary();
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("user_scores", (t) => {
    t.uuid("user_id").primary().references("id").inTable("users").onDelete("CASCADE");
    t.integer("score").notNullable().defaultTo(0);
    t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("applied_actions", (t) => {
    t.uuid("action_id").primary();
    t.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.integer("delta").notNullable();
    t.string("status", 32).notNullable().defaultTo("pending");
    t.timestamp("expires_at", { useTz: true }).notNullable();
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

/**
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("applied_actions");
  await knex.schema.dropTableIfExists("user_scores");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("users");
}
