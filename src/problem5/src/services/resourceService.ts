import { Resource } from "../models/Resource.js";
import type {
  ResourceCreateInput,
  ResourceListParams,
  ResourceUpdateInput,
} from "../models/Resource.js";
import type { ResourceRow } from "../types.js";

/**
 * Creates one resource row.
 *
 * @param input - Validated resource payload.
 * @returns Created row from database.
 */
export async function createResource(input: ResourceCreateInput): Promise<ResourceRow> {
  return Resource.create(input);
}

/**
 * Creates multiple resources in one operation.
 *
 * @param inputs - Validated list of resource payloads.
 * @returns Created resource rows.
 */
export async function createResourcesBulk(inputs: ResourceCreateInput[]): Promise<ResourceRow[]> {
  return Resource.createMany(inputs);
}

/**
 * Lists resources with filters and pagination.
 *
 * @param params - Query options for filtering, sorting, and paging.
 * @returns Rows and total count.
 */
export async function listResources(params: ResourceListParams): Promise<{
  rows: ResourceRow[];
  total: number;
}> {
  return Resource.list(params);
}

/**
 * Gets one resource by id.
 *
 * @param id - Resource identifier.
 * @returns Matching row or undefined.
 */
export async function getResourceById(id: number): Promise<ResourceRow | undefined> {
  return Resource.findById(id);
}

/**
 * Updates one resource by id.
 *
 * @param id - Resource identifier.
 * @param patch - Partial update payload.
 * @returns Updated row or undefined when missing.
 */
export async function updateResourceById(
  id: number,
  patch: ResourceUpdateInput,
): Promise<ResourceRow | undefined> {
  return Resource.updateById(id, patch);
}

/**
 * Deletes one resource by id.
 *
 * @param id - Resource identifier.
 * @returns Number of deleted rows.
 */
export async function deleteResourceById(id: number): Promise<number> {
  return Resource.deleteById(id);
}
