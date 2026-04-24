/**
 * Creates the initial `resources` table and supporting indexes.
 *
 * @param {import("knex").Knex} knex - Knex migration context.
 * @returns {Promise<void>} Resolves when schema creation is complete.
 * @behavior Creates table columns, defaults, and non-unique indexes used by filters.
 */
export async function up(knex) {
  await knex.schema.createTable("resources", (t) => {
    t.increments("id").primary();
    t.string("name", 255).notNullable();
    t.text("description");
    t.string("status", 64).notNullable().defaultTo("active");
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_resources_status ON resources (status)",
  );
  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_resources_name ON resources (name)",
  );
}

/**
 * Drops the `resources` table created by this migration.
 *
 * @param {import("knex").Knex} knex - Knex migration context.
 * @returns {Promise<void>} Resolves when rollback completes.
 * @behavior Uses `dropTableIfExists` to remain safe on partially initialized DBs.
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("resources");
}
