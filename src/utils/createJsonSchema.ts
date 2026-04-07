/**
 * Utility for building JSON Schema objects that inherit shared definitions from
 * the core schema.  Every schema produced by {@link createJsonSchema} automatically
 * extends `core#/$defs/event` (via `allOf.$ref`) and wraps its payload inside
 * `core#/$defs/payload`.  Changing a definition in the core schema therefore
 * propagates to all schemas built with this helper.
 */

/** A JSON Schema property definition (subset of draft 2020-12). */
export interface JsonSchemaProperty {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  format?: string;
  description?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  allOf?: object[];
  $ref?: string;
  [key: string]: unknown;
}

/** Describes the event-specific payload that will be merged with the core payload definition. */
export interface PayloadSchemaDefinition {
  /** Optional description for the payload object. */
  description?: string;
  /** Additional properties beyond those already declared in `core#/$defs/payload`. */
  properties: Record<string, JsonSchemaProperty>;
  /** Fields that must be present in a valid payload (may include fields from the core payload). */
  required: string[];
}

/** Options accepted by {@link createJsonSchema}. */
export interface CreateJsonSchemaOptions {
  /** Unique schema identifier (`$id`). */
  $id: string;
  /** Human-readable schema title. */
  title: string;
  /** Optional schema description. */
  description?: string;
  /**
   * When provided, a `type` property with this constant value is added to the
   * generated schema, narrowing the event type discriminant.
   */
  eventTypeConst?: string;
  /** Payload definition for the event. */
  payload: PayloadSchemaDefinition;
  /** Extra top-level properties to include alongside `type` and `payload`. */
  additionalProperties?: Record<string, JsonSchemaProperty>;
  /** Extra fields to add to the top-level `required` array (besides `"payload"`). */
  additionalRequired?: string[];
}

const CORE_SCHEMA_ID = "https://example.com/schemas/core";

/**
 * Builds a complete JSON Schema object for a GitHub event that:
 *  - inherits the base event structure from `core#/$defs/event`
 *  - inherits the base payload structure from `core#/$defs/payload`
 *
 * Because the returned schema references the core schema via `$ref`, any
 * change made to the core schema's `$defs` is automatically reflected in
 * every schema produced by this function.
 *
 * @example
 * ```ts
 * const myEventSchema = createJsonSchema({
 *   $id: "https://example.com/schemas/my-event",
 *   title: "GitHub My Event",
 *   description: "Triggered when something happens",
 *   eventTypeConst: "MyEvent",
 *   payload: {
 *     description: "Payload for MyEvent",
 *     properties: {
 *       action: { type: "string", description: "The action that was performed" },
 *     },
 *     required: ["action"],
 *   },
 * });
 * ```
 */
export function createJsonSchema(
  options: CreateJsonSchemaOptions,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  if (options.eventTypeConst !== undefined) {
    properties.type = {
      type: "string",
      const: options.eventTypeConst,
    };
  }

  properties.payload = {
    description:
      options.payload.description ??
      `Event-specific payload for a ${options.title}`,
    allOf: [{ $ref: `${CORE_SCHEMA_ID}#/$defs/payload` }],
    properties: options.payload.properties,
    required: options.payload.required,
  };

  if (options.additionalProperties !== undefined) {
    Object.assign(properties, options.additionalProperties);
  }

  const schema: Record<string, unknown> = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: options.$id,
    title: options.title,
    allOf: [{ $ref: `${CORE_SCHEMA_ID}#/$defs/event` }],
    properties,
    required: ["payload", ...(options.additionalRequired ?? [])],
  };

  if (options.description !== undefined) {
    schema.description = options.description;
  }

  return schema;
}
