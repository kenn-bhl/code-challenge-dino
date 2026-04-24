import { Router, type Request, type Response } from "express";
import { toPublic, type ResourceRow } from "../../types.js";
import type {
  ResourceListSortColumn,
  ResourceUpdateInput,
} from "../../models/Resource.js";
import { asyncHandler } from "../asyncHandler.js";
import {
  createResource,
  createResourcesBulk,
  deleteResourceById,
  getResourceById,
  listResources,
  updateResourceById,
} from "../resourceService.js";

/** Allowed status values for create, update, and list filtering. */
const ALLOWED_STATUS = new Set(["active", "archived", "draft"]);

/** Allowed columns for list sorting. */
const LIST_SORT_COLUMNS = new Set<ResourceListSortColumn>([
  "id",
  "name",
  "status",
  "created_at",
  "updated_at",
]);

/** Maximum number of items accepted by the bulk-create endpoint. */
const BULK_CREATE_MAX_ITEMS = 100;

/**
 * Parses a query string integer and clamps it to a safe range.
 *
 * @param value - Raw query value.
 * @param fallback - Default value used when parsing fails.
 * @param min - Minimum accepted number.
 * @param max - Maximum accepted number.
 * @returns Parsed integer within the provided range.
 * @behavior Returns `fallback` for non-string or invalid numeric input.
 */
function parseIntParam(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "string") {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

/**
 * Sends a standardized success envelope.
 *
 * @param res - Express response object.
 * @param data - Response payload.
 * @param message - Optional human-readable message.
 * @param status - HTTP success status code.
 * @returns void.
 * @behavior Writes `{ success: true, data, message }` JSON response.
 */
function sendSuccess(
  res: Response,
  data: unknown,
  message = "",
  status = 200,
): void {
  res.status(status).json({
    success: true,
    data,
    message,
  });
}

/**
 * Sends a standardized error envelope.
 *
 * @param res - Express response object.
 * @param status - HTTP error status code.
 * @param message - Error message for clients.
 * @param data - Optional extra metadata.
 * @returns void.
 * @behavior Writes `{ success: false, data, message }` JSON response.
 */
function sendError(
  res: Response,
  status: number,
  message: string,
  data: unknown = {},
): void {
  res.status(status).json({
    success: false,
    data,
    message,
  });
}

/**
 * Sends a standardized 400 response.
 *
 * @param res - Express response object.
 * @param message - Validation error message.
 * @returns void.
 * @behavior Delegates to `sendError` with status 400.
 */
function badRequest(res: Response, message: string): void {
  sendError(res, 400, message);
}

/**
 * Returns a route parameter as a normalized string.
 *
 * @param req - Express request object.
 * @param key - Parameter key from `req.params`.
 * @returns Route parameter value or empty string when missing.
 * @behavior Handles both `string` and `string[]` shapes from Express typings.
 */
function paramIdString(req: Request, key: string): string {
  const v = req.params[key];
  if (Array.isArray(v)) {
    return v[0] ?? "";
  }
  return v ?? "";
}

/**
 * Parses `:id` path parameter as positive integer.
 *
 * @param req - Express request object containing route params.
 * @returns Parsed id when valid, otherwise `null`.
 * @behavior Accepts only finite integers greater than zero.
 */
function parsePositiveId(req: Request): number | null {
  const id = Number.parseInt(paramIdString(req, "id"), 10);
  if (!Number.isFinite(id) || id < 1) {
    return null;
  }
  return id;
}

/**
 * Parses an optional integer query parameter.
 *
 * @param req - Express request object.
 * @param res - Express response object for validation errors.
 * @param key - Query parameter key.
 * @param min - Minimum accepted integer.
 * @param max - Maximum accepted integer.
 * @returns Parsed integer, `undefined` when omitted, or `null` when invalid.
 * @behavior Sends HTTP 400 automatically when parameter format/range is invalid.
 */
function parseOptionalQueryInt(
  req: Request,
  res: Response,
  key: string,
  min: number,
  max: number,
): number | undefined | null {
  const raw = req.query[key];
  if (raw === undefined || raw === "") {
    return undefined;
  }
  if (typeof raw !== "string") {
    badRequest(res, `${key} must be a string`);
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) {
    badRequest(res, `${key} must be an integer between ${min} and ${max}`);
    return null;
  }
  return n;
}

/**
 * Parses an optional ISO date-time query parameter.
 *
 * @param req - Express request object.
 * @param res - Express response object for validation errors.
 * @param key - Query parameter key.
 * @returns Date object, `undefined` when omitted, or `null` when invalid.
 * @behavior Sends HTTP 400 automatically when date parsing fails.
 */
function parseOptionalIsoDate(
  req: Request,
  res: Response,
  key: string,
): Date | undefined | null {
  const raw = req.query[key];
  if (raw === undefined || raw === "") {
    return undefined;
  }
  if (typeof raw !== "string") {
    badRequest(res, `${key} must be a string (ISO 8601)`);
    return null;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    badRequest(res, `${key} must be a valid ISO 8601 date-time`);
    return null;
  }
  return d;
}

/**
 * Normalizes and validates one bulk-create item.
 *
 * @param item - Untrusted item payload.
 * @returns Success object with normalized payload or failure reason.
 * @behavior Applies the same validation constraints as single-create endpoint.
 */
function normalizeCreatePayload(
  item: unknown,
):
  | { ok: true; value: { name: string; description: string | null; status: string } }
  | { ok: false; reason: string } {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return { ok: false, reason: "item must be an object" };
  }

  const payload = item as Record<string, unknown>;

  if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
    return { ok: false, reason: "name is required (non-empty string)" };
  }

  const status = typeof payload.status === "string" ? payload.status : "active";
  if (!ALLOWED_STATUS.has(status)) {
    return {
      ok: false,
      reason: `status must be one of: ${[...ALLOWED_STATUS].join(", ")}`,
    };
  }

  let description: string | null = null;
  if (payload.description !== undefined && payload.description !== null) {
    if (typeof payload.description !== "string") {
      return { ok: false, reason: "description must be a string or null" };
    }
    description = payload.description;
  }

  return {
    ok: true,
    value: {
      name: payload.name.trim(),
      description,
      status,
    },
  };
}

/**
 * Handles single resource creation.
 *
 * @param req - Express request with create payload.
 * @param res - Express response object.
 * @returns Promise resolved after response is written.
 * @behavior Validates input, inserts one row, responds with HTTP 201 envelope.
 */
async function handleCreateResource(req: Request, res: Response): Promise<void> {
  const parsed = normalizeCreatePayload(req.body);
  if (!parsed.ok) {
    badRequest(res, parsed.reason);
    return;
  }

  const row = await createResource(parsed.value);
  sendSuccess(res, toPublic(row), "resource created", 201);
}

/**
 * Handles bulk resource creation with partial success semantics.
 *
 * @param req - Express request containing `{ items: [...] }`.
 * @param res - Express response object.
 * @returns Promise resolved after response is written.
 * @behavior
 * - Validates each item independently.
 * - Inserts all valid rows in one DB call.
 * - Returns HTTP 201 when all succeed, HTTP 207 when partial failures exist.
 */
async function handleCreateResourcesBulk(req: Request, res: Response): Promise<void> {
  const { items } = req.body as { items?: unknown };

  if (!Array.isArray(items)) {
    badRequest(res, "items must be an array");
    return;
  }
  if (items.length === 0) {
    badRequest(res, "items must contain at least 1 item");
    return;
  }
  if (items.length > BULK_CREATE_MAX_ITEMS) {
    badRequest(res, `items length must be <= ${BULK_CREATE_MAX_ITEMS}`);
    return;
  }

  const valid: Array<{ name: string; description: string | null; status: string }> = [];
  const errors: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const parsed = normalizeCreatePayload(items[i]);
    if (!parsed.ok) {
      errors.push({ index: i, reason: parsed.reason });
      continue;
    }
    valid.push(parsed.value);
  }

  let created: ResourceRow[] = [];
  if (valid.length > 0) {
    created = await createResourcesBulk(valid);
  }

  sendSuccess(
    res,
    {
      items: created.map(toPublic),
      summary: {
        requested: items.length,
        created: created.length,
        failed: errors.length,
        hasErrors: errors.length > 0,
      },
      errors,
    },
    errors.length > 0 ? "bulk create completed with partial errors" : "bulk create completed",
    errors.length > 0 ? 207 : 201,
  );
}

/**
 * Handles paginated resource listing with rich filtering and sorting.
 *
 * @param req - Express request carrying query parameters.
 * @param res - Express response object.
 * @returns Promise resolved after response is written.
 * @behavior Validates all filters, executes list query, and returns pagination metadata.
 */
async function handleListResources(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const status =
    typeof req.query.status === "string" && ALLOWED_STATUS.has(req.query.status)
      ? req.query.status
      : undefined;

  let nameExact: string | undefined;
  const nameExactRaw = req.query.name_exact;
  if (nameExactRaw !== undefined && nameExactRaw !== "") {
    if (typeof nameExactRaw !== "string") {
      badRequest(res, "name_exact must be a string");
      return;
    }
    nameExact = nameExactRaw.trim();
    if (nameExact.length === 0) {
      badRequest(res, "name_exact must be non-empty when provided");
      return;
    }
  }

  let descriptionContains: string | undefined;
  const descRaw = req.query.description;
  if (descRaw !== undefined && descRaw !== "") {
    if (typeof descRaw !== "string") {
      badRequest(res, "description must be a string");
      return;
    }
    descriptionContains = descRaw.trim();
  }

  const idFrom = parseOptionalQueryInt(req, res, "id_from", 1, 2_147_483_647);
  if (idFrom === null) {
    return;
  }
  const idTo = parseOptionalQueryInt(req, res, "id_to", 1, 2_147_483_647);
  if (idTo === null) {
    return;
  }
  if (idFrom !== undefined && idTo !== undefined && idFrom > idTo) {
    badRequest(res, "id_from must be <= id_to");
    return;
  }

  const createdFrom = parseOptionalIsoDate(req, res, "created_from");
  if (createdFrom === null) {
    return;
  }
  const createdTo = parseOptionalIsoDate(req, res, "created_to");
  if (createdTo === null) {
    return;
  }
  if (
    createdFrom !== undefined &&
    createdTo !== undefined &&
    createdFrom.getTime() > createdTo.getTime()
  ) {
    badRequest(res, "created_from must be <= created_to");
    return;
  }

  const updatedFrom = parseOptionalIsoDate(req, res, "updated_from");
  if (updatedFrom === null) {
    return;
  }
  const updatedTo = parseOptionalIsoDate(req, res, "updated_to");
  if (updatedTo === null) {
    return;
  }
  if (
    updatedFrom !== undefined &&
    updatedTo !== undefined &&
    updatedFrom.getTime() > updatedTo.getTime()
  ) {
    badRequest(res, "updated_from must be <= updated_to");
    return;
  }

  const sortRaw = typeof req.query.sort === "string" ? req.query.sort.trim() : "id";
  if (!LIST_SORT_COLUMNS.has(sortRaw as ResourceListSortColumn)) {
    badRequest(res, `sort must be one of: ${[...LIST_SORT_COLUMNS].join(", ")}`);
    return;
  }
  const sort = sortRaw as ResourceListSortColumn;

  const orderRaw =
    typeof req.query.order === "string" ? req.query.order.trim().toLowerCase() : "asc";
  if (orderRaw !== "asc" && orderRaw !== "desc") {
    badRequest(res, "order must be asc or desc");
    return;
  }
  const order = orderRaw;

  const limit = parseIntParam(req.query.limit, 20, 1, 100);
  const offset = parseIntParam(req.query.offset, 0, 0, 1_000_000);

  const { rows, total } = await listResources({
    q: q.length > 0 ? q : undefined,
    status,
    nameExact,
    descriptionContains:
      descriptionContains && descriptionContains.length > 0 ? descriptionContains : undefined,
    idFrom,
    idTo,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    sort,
    order,
    limit,
    offset,
  });

  const page = Math.floor(offset / limit) + 1;
  const hasMore = offset + rows.length < total;

  sendSuccess(res, {
    items: rows.map(toPublic),
    pagination: {
      total,
      limit,
      offset,
      page,
      hasMore,
    },
  });
}

/**
 * Handles resource detail retrieval.
 *
 * @param req - Express request containing `:id` path parameter.
 * @param res - Express response object.
 * @returns Promise resolved after response is written.
 * @behavior Returns HTTP 404 when no resource exists with the requested id.
 */
async function handleGetResourceById(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req);
  if (id === null) {
    badRequest(res, "invalid id");
    return;
  }

  const row = await getResourceById(id);
  if (!row) {
    sendError(res, 404, "resource not found");
    return;
  }

  sendSuccess(res, toPublic(row));
}

/**
 * Handles partial resource updates.
 *
 * @param req - Express request containing `:id` and patch body.
 * @param res - Express response object.
 * @returns Promise resolved after response is written.
 * @behavior Requires at least one mutable field and returns HTTP 404 when id is missing.
 */
async function handleUpdateResource(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req);
  if (id === null) {
    badRequest(res, "invalid id");
    return;
  }

  const body = req.body as Record<string, unknown>;
  const patch: ResourceUpdateInput = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      badRequest(res, "name must be a non-empty string when provided");
      return;
    }
    patch.name = body.name.trim();
  }

  if ("description" in body) {
    if (body.description !== null && typeof body.description !== "string") {
      badRequest(res, "description must be string or null");
      return;
    }
    patch.description = body.description as string | null;
  }

  if ("status" in body) {
    if (typeof body.status !== "string" || !ALLOWED_STATUS.has(body.status)) {
      badRequest(res, `status must be one of: ${[...ALLOWED_STATUS].join(", ")}`);
      return;
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    badRequest(res, "no updatable fields provided (name, description, status)");
    return;
  }

  const row = await updateResourceById(id, patch);
  if (!row) {
    sendError(res, 404, "resource not found");
    return;
  }

  sendSuccess(res, toPublic(row));
}

/**
 * Handles resource deletion.
 *
 * @param req - Express request containing `:id` path parameter.
 * @param res - Express response object.
 * @returns Promise resolved after response is written.
 * @behavior Returns success envelope with deleted id, or 404 when id does not exist.
 */
async function handleDeleteResource(req: Request, res: Response): Promise<void> {
  const id = parsePositiveId(req);
  if (id === null) {
    badRequest(res, "invalid id");
    return;
  }

  const deleted = await deleteResourceById(id);
  if (deleted === 0) {
    sendError(res, 404, "resource not found");
    return;
  }

  sendSuccess(res, { deleted: true, id }, "resource deleted");
}

/**
 * Creates the resources router and binds all CRUD endpoints.
 *
 * @returns Express router mounted under `/api/resources`.
 * @behavior Registers list/create, bulk-create, detail, update, and delete routes.
 */
export function resourcesRouter(): Router {
  const r = Router();

  r.route("/")
    .get(asyncHandler(handleListResources))
    .post(asyncHandler(handleCreateResource));

  r.post("/bulk", asyncHandler(handleCreateResourcesBulk));

  r.route("/:id")
    .get(asyncHandler(handleGetResourceById))
    .put(asyncHandler(handleUpdateResource))
    .delete(asyncHandler(handleDeleteResource));

  return r;
}
