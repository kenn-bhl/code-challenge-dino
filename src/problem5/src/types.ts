/** Database row shape returned by Knex for table `resources`. */
export type ResourceRow = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

/** Public API shape exposed to clients (camelCase timestamps). */
export type ResourcePublic = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Maps an internal database row into public API shape.
 *
 * @param row - Database row from table `resources`.
 * @returns Public response object with ISO timestamp strings.
 * @behavior Converts `created_at` / `updated_at` from Date to ISO strings.
 */
export function toPublic(row: ResourceRow): ResourcePublic {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
