import {
  createJsonSchema,
  CreateJsonSchemaOptions,
} from "../src/utils/createJsonSchema";

// ---------------------------------------------------------------------------
// Shared schema option fixture
// ---------------------------------------------------------------------------

const baseOptions: CreateJsonSchemaOptions = {
  $id: "https://example.com/schemas/test-event",
  title: "GitHub Test Event",
  description: "A test event",
  eventTypeConst: "TestEvent",
  payload: {
    description: "Test payload",
    properties: {
      action: {
        type: "string",
        description: "The action performed",
      },
    },
    required: ["action"],
  },
};

// ---------------------------------------------------------------------------
// createJsonSchema – schema shape
// ---------------------------------------------------------------------------

describe("createJsonSchema – schema shape", () => {
  it("includes $schema and $id", () => {
    const schema = createJsonSchema(baseOptions);
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.$id).toBe("https://example.com/schemas/test-event");
  });

  it("includes title and description", () => {
    const schema = createJsonSchema(baseOptions);
    expect(schema.title).toBe("GitHub Test Event");
    expect(schema.description).toBe("A test event");
  });

  it("omits description when not provided", () => {
    const { description: _d, ...optionsWithoutDesc } = baseOptions;
    const schema = createJsonSchema(optionsWithoutDesc);
    expect(schema).not.toHaveProperty("description");
  });
});

// ---------------------------------------------------------------------------
// createJsonSchema – core inheritance via allOf $ref
// ---------------------------------------------------------------------------

describe("createJsonSchema – core inheritance", () => {
  it("extends core event definition via allOf.$ref", () => {
    const schema = createJsonSchema(baseOptions);
    const allOf = schema.allOf as Array<{ $ref: string }>;
    expect(Array.isArray(allOf)).toBe(true);
    expect(allOf[0].$ref).toBe(
      "https://example.com/schemas/core#/$defs/event",
    );
  });

  it("payload inherits core payload definition via allOf.$ref", () => {
    const schema = createJsonSchema(baseOptions);
    const properties = schema.properties as Record<string, unknown>;
    const payload = properties.payload as Record<string, unknown>;
    const payloadAllOf = payload.allOf as Array<{ $ref: string }>;
    expect(Array.isArray(payloadAllOf)).toBe(true);
    expect(payloadAllOf[0].$ref).toBe(
      "https://example.com/schemas/core#/$defs/payload",
    );
  });
});

// ---------------------------------------------------------------------------
// createJsonSchema – event type discriminant
// ---------------------------------------------------------------------------

describe("createJsonSchema – eventTypeConst", () => {
  it("adds a type property with the given const value", () => {
    const schema = createJsonSchema(baseOptions);
    const properties = schema.properties as Record<string, unknown>;
    const typeProp = properties.type as Record<string, unknown>;
    expect(typeProp.type).toBe("string");
    expect(typeProp.const).toBe("TestEvent");
  });

  it("omits the type property when eventTypeConst is not provided", () => {
    const { eventTypeConst: _etc, ...optionsWithoutConst } = baseOptions;
    const schema = createJsonSchema(optionsWithoutConst);
    const properties = schema.properties as Record<string, unknown>;
    expect(properties).not.toHaveProperty("type");
  });
});

// ---------------------------------------------------------------------------
// createJsonSchema – payload definition
// ---------------------------------------------------------------------------

describe("createJsonSchema – payload definition", () => {
  it("includes the event-specific payload properties", () => {
    const schema = createJsonSchema(baseOptions);
    const properties = schema.properties as Record<string, unknown>;
    const payload = properties.payload as Record<string, unknown>;
    const payloadProps = payload.properties as Record<string, unknown>;
    expect(payloadProps).toHaveProperty("action");
  });

  it("includes the required payload fields", () => {
    const schema = createJsonSchema(baseOptions);
    const properties = schema.properties as Record<string, unknown>;
    const payload = properties.payload as Record<string, unknown>;
    expect(payload.required).toContain("action");
  });

  it("uses a default payload description when none is provided", () => {
    const options: CreateJsonSchemaOptions = {
      ...baseOptions,
      payload: {
        properties: { action: { type: "string" } },
        required: ["action"],
      },
    };
    const schema = createJsonSchema(options);
    const properties = schema.properties as Record<string, unknown>;
    const payload = properties.payload as Record<string, unknown>;
    expect(typeof payload.description).toBe("string");
    expect((payload.description as string).length).toBeGreaterThan(0);
  });

  it("uses the custom payload description when provided", () => {
    const schema = createJsonSchema(baseOptions);
    const properties = schema.properties as Record<string, unknown>;
    const payload = properties.payload as Record<string, unknown>;
    expect(payload.description).toBe("Test payload");
  });
});

// ---------------------------------------------------------------------------
// createJsonSchema – required fields
// ---------------------------------------------------------------------------

describe("createJsonSchema – required fields", () => {
  it("includes 'payload' in the top-level required array by default", () => {
    const schema = createJsonSchema(baseOptions);
    expect(schema.required).toContain("payload");
  });

  it("includes additionalRequired fields in the top-level required array", () => {
    const schema = createJsonSchema({
      ...baseOptions,
      additionalRequired: ["org"],
    });
    expect(schema.required).toContain("payload");
    expect(schema.required).toContain("org");
  });
});

// ---------------------------------------------------------------------------
// createJsonSchema – additionalProperties
// ---------------------------------------------------------------------------

describe("createJsonSchema – additionalProperties", () => {
  it("merges extra top-level properties into the schema", () => {
    const schema = createJsonSchema({
      ...baseOptions,
      additionalProperties: {
        extra_field: { type: "string", description: "An extra field" },
      },
    });
    const properties = schema.properties as Record<string, unknown>;
    expect(properties).toHaveProperty("extra_field");
  });
});

// ---------------------------------------------------------------------------
// createJsonSchema – inheritance demo (core change propagation)
// ---------------------------------------------------------------------------

describe("createJsonSchema – multiple schemas share same core $ref", () => {
  it("two schemas generated from different options both reference the same core event $ref", () => {
    const schemaA = createJsonSchema({
      $id: "https://example.com/schemas/event-a",
      title: "Event A",
      payload: {
        properties: { field_a: { type: "string" } },
        required: ["field_a"],
      },
    });
    const schemaB = createJsonSchema({
      $id: "https://example.com/schemas/event-b",
      title: "Event B",
      payload: {
        properties: { field_b: { type: "integer" } },
        required: ["field_b"],
      },
    });

    const refA = (schemaA.allOf as Array<{ $ref: string }>)[0].$ref;
    const refB = (schemaB.allOf as Array<{ $ref: string }>)[0].$ref;
    expect(refA).toBe(refB);
    expect(refA).toBe("https://example.com/schemas/core#/$defs/event");
  });
});

// ---------------------------------------------------------------------------
// createJsonSchema – existing event schemas retain correct structure
// ---------------------------------------------------------------------------

describe("createJsonSchema – create-event schema", () => {
  // Import the generated schema to verify it is still structured correctly
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const createEventSchema: Record<string, unknown> = require("../src/schemas/create-event.schema").default;

  it("has the correct $id", () => {
    expect(createEventSchema.$id).toBe(
      "https://example.com/schemas/create-event",
    );
  });

  it("inherits from core event via allOf.$ref", () => {
    const allOf = createEventSchema.allOf as Array<{ $ref: string }>;
    expect(allOf[0].$ref).toBe(
      "https://example.com/schemas/core#/$defs/event",
    );
  });

  it("has payload.allOf referencing core payload", () => {
    const properties = createEventSchema.properties as Record<string, unknown>;
    const payload = properties.payload as Record<string, unknown>;
    const payloadAllOf = payload.allOf as Array<{ $ref: string }>;
    expect(payloadAllOf[0].$ref).toBe(
      "https://example.com/schemas/core#/$defs/payload",
    );
  });
});

describe("createJsonSchema – delete-event schema", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const deleteEventSchema: Record<string, unknown> = require("../src/schemas/delete-event.schema").default;

  it("has the correct $id", () => {
    expect(deleteEventSchema.$id).toBe(
      "https://example.com/schemas/delete-event",
    );
  });

  it("inherits from core event via allOf.$ref", () => {
    const allOf = deleteEventSchema.allOf as Array<{ $ref: string }>;
    expect(allOf[0].$ref).toBe(
      "https://example.com/schemas/core#/$defs/event",
    );
  });
});
