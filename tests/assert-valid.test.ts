import {
  assertValid,
  SchemaValidationError,
} from "../src/validators/github-event.validator";
import type { CreateEvent, DeleteEvent } from "../src/types/github-events";

// ---------------------------------------------------------------------------
// Shared fixture helpers (mirroring existing test conventions)
// ---------------------------------------------------------------------------

const actor = {
  id: 1,
  login: "octocat",
  url: "https://api.github.com/users/octocat",
  avatar_url: "https://github.com/images/error/octocat_happy.gif",
};

const repo = {
  id: 123456789,
  name: "octocat/Hello-World",
  url: "https://api.github.com/repos/octocat/Hello-World",
};

const baseEvent = {
  id: "1296269433",
  actor,
  repo,
  public: true,
  created_at: "2022-01-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// assertValid – CreateEvent
// ---------------------------------------------------------------------------

describe("assertValid – CreateEvent", () => {
  const validCreateEvent = {
    ...baseEvent,
    type: "CreateEvent",
    payload: {
      ref: null,
      ref_type: "repository",
      master_branch: "main",
      description: "Hello World",
      pusher_type: "user",
    },
  };

  it("returns typed data for a valid CreateEvent", () => {
    const result = assertValid(
      "https://example.com/schemas/create-event",
      validCreateEvent,
    );
    expect(result.type).toBe("CreateEvent");
    expect(result.payload.ref_type).toBe("repository");

    // Compile-time type check: the return type should be CreateEvent
    const _typeCheck: CreateEvent = result;
    expect(_typeCheck).toBeDefined();
  });

  it("throws SchemaValidationError for an invalid CreateEvent", () => {
    const invalidEvent = {
      ...baseEvent,
      type: "CreateEvent",
      payload: {
        // missing required ref_type, master_branch, pusher_type
      },
    };

    expect(() =>
      assertValid("https://example.com/schemas/create-event", invalidEvent),
    ).toThrow(SchemaValidationError);
  });

  it("includes schema id and validation errors on thrown error", () => {
    const invalidEvent = {
      ...baseEvent,
      type: "CreateEvent",
      payload: {
        ref_type: "invalid-value",
        master_branch: "main",
        pusher_type: "user",
      },
    };

    try {
      assertValid("https://example.com/schemas/create-event", invalidEvent);
      fail("Expected SchemaValidationError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaValidationError);
      const validationError = err as SchemaValidationError;
      expect(validationError.schemaId).toBe(
        "https://example.com/schemas/create-event",
      );
      expect(validationError.validationErrors.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// assertValid – DeleteEvent
// ---------------------------------------------------------------------------

describe("assertValid – DeleteEvent", () => {
  const validDeleteEvent = {
    ...baseEvent,
    type: "DeleteEvent",
    payload: {
      ref: "feature-branch",
      ref_type: "branch",
      pusher_type: "user",
    },
  };

  it("returns typed data for a valid DeleteEvent", () => {
    const result = assertValid(
      "https://example.com/schemas/delete-event",
      validDeleteEvent,
    );
    expect(result.type).toBe("DeleteEvent");
    expect(result.payload.ref).toBe("feature-branch");

    // Compile-time type check: the return type should be DeleteEvent
    const _typeCheck: DeleteEvent = result;
    expect(_typeCheck).toBeDefined();
  });

  it("throws SchemaValidationError for an invalid DeleteEvent", () => {
    const invalidEvent = {
      ...baseEvent,
      type: "DeleteEvent",
      payload: {
        // missing required ref, ref_type, pusher_type
      },
    };

    expect(() =>
      assertValid("https://example.com/schemas/delete-event", invalidEvent),
    ).toThrow(SchemaValidationError);
  });

  it("throws when actor is missing required fields", () => {
    const invalidEvent = {
      ...baseEvent,
      actor: { id: 1, login: "octocat" }, // url missing
      type: "DeleteEvent",
      payload: {
        ref: "old-branch",
        ref_type: "branch",
        pusher_type: "user",
      },
    };

    expect(() =>
      assertValid("https://example.com/schemas/delete-event", invalidEvent),
    ).toThrow(SchemaValidationError);
  });
});

// ---------------------------------------------------------------------------
// assertValid – error message quality
// ---------------------------------------------------------------------------

describe("assertValid – error details", () => {
  it("error message contains the schema id", () => {
    expect(() =>
      assertValid("https://example.com/schemas/create-event", {}),
    ).toThrow(/create-event/);
  });

  it("error name is SchemaValidationError", () => {
    try {
      assertValid("https://example.com/schemas/create-event", {});
      fail("Expected error");
    } catch (err) {
      expect((err as Error).name).toBe("SchemaValidationError");
    }
  });
});
