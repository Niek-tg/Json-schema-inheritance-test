import Ajv2020, { ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import coreSchema from "../schemas/core.schema.json";
import createEventSchema from "../schemas/create-event.schema.json";
import deleteEventSchema from "../schemas/delete-event.schema.json";

/**
 * Validation result returned by each validator function.
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string; instancePath: string }> | null;
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

  // Register the core schema first so refs resolve correctly
  ajv.addSchema(coreSchema as object);
  ajv.addSchema(createEventSchema as object);
  ajv.addSchema(deleteEventSchema as object);

  return ajv;
}

const ajv = buildAjv();

/**
 * Validates data against a schema identified by its `$id`.
 */
function validate(schemaId: string, data: unknown): ValidationResult {
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
  return validate("https://example.com/schemas/create-event", data);
}

/**
 * Validates a GitHub DeleteEvent payload.
 */
export function validateDeleteEvent(data: unknown): ValidationResult {
  return validate("https://example.com/schemas/delete-event", data);
}
