import Ajv2020, { ErrorObject, ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { schemas } from "../schemas/registry";
import type { SchemaMap } from "../types/github-events";

/**
 * Validation result returned by each validator function.
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string; instancePath: string }> | null;
}

/**
 * Error thrown by {@link assertValid} when validation fails.
 */
export class SchemaValidationError extends Error {
  public readonly schemaId: string;
  public readonly validationErrors: Array<{
    message: string;
    instancePath: string;
  }>;

  constructor(schemaId: string, errors: ErrorObject[]) {
    const details = errors
      .map(
        (e) =>
          `${e.instancePath || "/"}: ${e.message ?? "Unknown error"}`
      )
      .join("; ");
    super(`Validation failed for schema ${schemaId}: ${details}`);
    this.name = "SchemaValidationError";
    this.schemaId = schemaId;
    this.validationErrors = errors.map((e) => ({
      message: e.message ?? "Unknown error",
      instancePath: e.instancePath,
    }));
  }
}

/**
 * Creates and configures an AJV instance with all GitHub event schemas loaded.
 * The core schema (vocabulary / shared $defs) is added first so that
 * individual event schemas can resolve `$ref` pointers into it.
 */
function buildAjv(): Ajv2020 {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });
  addFormats(ajv);

  for (const schema of schemas) {
    ajv.addSchema(schema);
  }

  return ajv;
}

const ajv = buildAjv();

/**
 * Validates data against a schema identified by its `$id`.
 */
export function validateSchema<K extends keyof SchemaMap>(
  schemaId: K,
  data: unknown,
): ValidationResult {
  const validateFn: ValidateFunction = ajv.getSchema(schemaId) as ValidateFunction;
  if (!validateFn) {
    throw new Error(`Schema not found: ${schemaId}`);
  }
  const valid = validateFn(data) as boolean;
  return {
    valid,
    errors: valid
      ? null
      : (validateFn.errors ?? []).map((e) => ({
          message: e.message ?? "Unknown error",
          instancePath: e.instancePath,
        })),
  };
}

/**
 * Validates a GitHub CreateEvent payload.
 */
export function validateCreateEvent(data: unknown): ValidationResult {
  return validateSchema("https://example.com/schemas/create-event", data);
}

/**
 * Validates a GitHub DeleteEvent payload.
 */
export function validateDeleteEvent(data: unknown): ValidationResult {
  return validateSchema("https://example.com/schemas/delete-event", data);
}

/**
 * Validates `data` against the schema identified by `schemaId` and returns the
 * data cast to the corresponding TypeScript type. Throws a
 * {@link SchemaValidationError} when validation fails.
 *
 * The return type is fully inferred from the schema identifier via the
 * {@link SchemaMap} interface, so callers receive precise types without
 * explicit type annotations.
 *
 * @example
 * ```ts
 * const event = assertValid("https://example.com/schemas/create-event", data);
 * // event is typed as CreateEvent
 * ```
 */
export function assertValid<K extends keyof SchemaMap>(
  schemaId: K,
  data: unknown,
): SchemaMap[K] {
  const validateFn = ajv.getSchema(schemaId) as ValidateFunction | undefined;
  if (!validateFn) {
    throw new Error(`Schema not found: ${schemaId}`);
  }
  if (!validateFn(data)) {
    throw new SchemaValidationError(schemaId, validateFn.errors ?? []);
  }
  return data as SchemaMap[K];
}
