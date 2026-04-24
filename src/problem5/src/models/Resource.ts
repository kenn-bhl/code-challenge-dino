import { getKnex } from "../../database/db.js";
import type { ResourceRow } from "../types.js";

const TABLE = "resources";

export type ResourceCreateInput = {
  name: string;
  description: string | null;
  status: string;
};

export type ResourceListSortColumn =
  | "id"
  | "name"
  | "status"
  | "created_at"
  | "updated_at";

export type ResourceListSortOrder = "asc" | "desc";

export type ResourceListParams = {
  /** Case-insensitive substring match on `name`. */
  q?: string;
  /** Exact match on `status`. */
  status?: string;
  /** Exact match on `name`. */
  nameExact?: string;
  /** Case-insensitive substring match on `description`. */
  descriptionContains?: string;
  idFrom?: number;
  idTo?: number;
  createdFrom?: Date;
  createdTo?: Date;
  updatedFrom?: Date;
  updatedTo?: Date;
  sort: ResourceListSortColumn;
  order: ResourceListSortOrder;
  limit: number;
  offset: number;
};

export type ResourceUpdateInput = {
  name?: string;
  description?: string | null;
  status?: string;
};

/**
 * Data-access model for the `resources` table.
 */
export class Resource {
  static readonly tableName = TABLE;

  /**
   * Inserts a single resource row.
   *
   * @param input - Resource payload to persist.
   * @returns Newly created database row.
   * @behavior Uses PostgreSQL `returning("*")` and throws if no row is returned.
   */
  static async create(input: ResourceCreateInput): Promise<ResourceRow> {
    const k = getKnex();
    const rows = await k<ResourceRow>(TABLE)
      .insert({
        name: input.name,
        description: input.description,
        status: input.status,
      })
      .returning("*");

    const row = rows[0];
    if (!row) {
      throw new Error("Resource.create: insert returned no row");
    }

    return row;
  }

  /**
   * Inserts multiple resources in a single query.
   *
   * @param inputs - Array of resource payloads.
   * @returns Array of created rows.
   * @behavior Returns an empty array immediately when `inputs` is empty.
   */
  static async createMany(inputs: ResourceCreateInput[]): Promise<ResourceRow[]> {
    if (inputs.length === 0) {
      return [];
    }

    const k = getKnex();
    return k<ResourceRow>(TABLE)
      .insert(
        inputs.map((input) => ({
          name: input.name,
          description: input.description,
          status: input.status,
        })),
      )
      .returning("*");
  }

  /**
   * Retrieves a resource by primary key.
   *
   * @param id - Resource identifier.
   * @returns Found row or `undefined` when not found.
   * @behavior Executes `WHERE id = ? LIMIT 1` via Knex `.first()`.
   */
  static async findById(id: number): Promise<ResourceRow | undefined> {
    const k = getKnex();
    return k<ResourceRow>(TABLE).where({ id }).first();
  }

  /**
   * Builds the base list query with optional filters.
   *
   * @param k - Knex instance.
   * @param params - List filtering options.
   * @returns Knex query builder with all predicates applied.
   * @behavior Applies only filters that are defined to keep query plans simple.
   */
  private static buildListQuery(
    k: ReturnType<typeof getKnex>,
    params: ResourceListParams,
  ) {
    let q = k<ResourceRow>(TABLE);

    if (params.q && params.q.length > 0) {
      q = q.whereILike("name", `%${params.q}%`);
    }
    if (params.status) {
      q = q.where("status", params.status);
    }
    if (params.nameExact !== undefined) {
      q = q.where("name", params.nameExact);
    }
    if (params.descriptionContains && params.descriptionContains.length > 0) {
      q = q.whereILike("description", `%${params.descriptionContains}%`);
    }
    if (params.idFrom !== undefined) {
      q = q.where("id", ">=", params.idFrom);
    }
    if (params.idTo !== undefined) {
      q = q.where("id", "<=", params.idTo);
    }
    if (params.createdFrom !== undefined) {
      q = q.where("created_at", ">=", params.createdFrom);
    }
    if (params.createdTo !== undefined) {
      q = q.where("created_at", "<=", params.createdTo);
    }
    if (params.updatedFrom !== undefined) {
      q = q.where("updated_at", ">=", params.updatedFrom);
    }
    if (params.updatedTo !== undefined) {
      q = q.where("updated_at", "<=", params.updatedTo);
    }

    return q;
  }

  /**
   * Lists resources with pagination and returns total count.
   *
   * @param params - Filter, sorting, and pagination settings.
   * @returns Object with paginated rows and total count.
   * @behavior Runs two queries: count query + page query using cloned builders.
   */
  static async list(params: ResourceListParams): Promise<{
    rows: ResourceRow[];
    total: number;
  }> {
    const k = getKnex();
    const q = Resource.buildListQuery(k, params);

    const countRow = await q
      .clone()
      .count<{ count: string }>("* as count")
      .first();
    const total = Number.parseInt(countRow?.count ?? "0", 10);

    const rows = await q
      .clone()
      .orderBy(params.sort, params.order)
      .limit(params.limit)
      .offset(params.offset);

    return { rows, total };
  }

  /**
   * Updates a resource by id.
   *
   * @param id - Resource identifier.
   * @param patch - Partial update payload.
   * @returns Updated row or `undefined` if not found.
   * @behavior Always updates `updated_at`; returns current row when patch is empty.
   */
  static async updateById(
    id: number,
    patch: ResourceUpdateInput,
  ): Promise<ResourceRow | undefined> {
    const k = getKnex();
    const data: {
      name?: string;
      description?: string | null;
      status?: string;
      updated_at: ReturnType<typeof k.fn.now>;
    } = { updated_at: k.fn.now() };

    if (patch.name !== undefined) {
      data.name = patch.name;
    }
    if (patch.description !== undefined) {
      data.description = patch.description;
    }
    if (patch.status !== undefined) {
      data.status = patch.status;
    }

    if (Object.keys(data).length === 1) {
      return Resource.findById(id);
    }

    const rows = await k<ResourceRow>(TABLE)
      .where({ id })
      .update(data)
      .returning("*");

    return rows[0];
  }

  /**
   * Deletes a resource by id.
   *
   * @param id - Resource identifier.
   * @returns Number of deleted rows (0 or 1).
   * @behavior Performs hard delete with `DELETE FROM resources WHERE id = ?`.
   */
  static async deleteById(id: number): Promise<number> {
    const k = getKnex();
    return k(TABLE).where({ id }).delete();
  }
}
