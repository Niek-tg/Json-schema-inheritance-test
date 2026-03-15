import {
  validateCreateEvent,
  validateDeleteEvent,
} from "../src/validators/github-event.validator";

// ---------------------------------------------------------------------------
// Shared fixture helpers
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
// CreateEvent tests
// ---------------------------------------------------------------------------

describe("validateCreateEvent", () => {
  it("accepts a valid repository CreateEvent", () => {
    const event = {
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
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("accepts a valid branch CreateEvent", () => {
    const event = {
      ...baseEvent,
      type: "CreateEvent",
      payload: {
        ref: "feature-branch",
        ref_type: "branch",
        master_branch: "main",
        description: null,
        pusher_type: "user",
      },
    };
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("accepts a valid tag CreateEvent", () => {
    const event = {
      ...baseEvent,
      type: "CreateEvent",
      payload: {
        ref: "v1.0.0",
        ref_type: "tag",
        master_branch: "main",
        description: null,
        pusher_type: "user",
      },
    };
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("accepts a CreateEvent with an optional org field", () => {
    const event = {
      ...baseEvent,
      type: "CreateEvent",
      org: {
        id: 1,
        login: "github",
        url: "https://api.github.com/orgs/github",
      },
      payload: {
        ref: null,
        ref_type: "repository",
        master_branch: "main",
        pusher_type: "user",
      },
    };
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(true);
  });

  it("rejects a CreateEvent missing required payload fields", () => {
    const event = {
      ...baseEvent,
      type: "CreateEvent",
      payload: {
        ref: null,
        // ref_type missing
        master_branch: "main",
        pusher_type: "user",
      },
    };
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).not.toBeNull();
  });

  it("rejects a CreateEvent with an invalid ref_type value", () => {
    const event = {
      ...baseEvent,
      type: "CreateEvent",
      payload: {
        ref: null,
        ref_type: "commit", // not allowed
        master_branch: "main",
        pusher_type: "user",
      },
    };
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(false);
  });

  it("rejects a CreateEvent missing the top-level actor", () => {
    const { actor: _actor, ...eventWithoutActor } = baseEvent;
    const event = {
      ...eventWithoutActor,
      type: "CreateEvent",
      payload: {
        ref: null,
        ref_type: "repository",
        master_branch: "main",
        pusher_type: "user",
      },
    };
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(false);
  });

  it("rejects a CreateEvent with a malformed created_at timestamp", () => {
    const event = {
      ...baseEvent,
      created_at: "not-a-date",
      type: "CreateEvent",
      payload: {
        ref: null,
        ref_type: "repository",
        master_branch: "main",
        pusher_type: "user",
      },
    };
    const result = validateCreateEvent(event);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DeleteEvent tests
// ---------------------------------------------------------------------------

describe("validateDeleteEvent", () => {
  it("accepts a valid branch DeleteEvent", () => {
    const event = {
      ...baseEvent,
      type: "DeleteEvent",
      payload: {
        ref: "feature-branch",
        ref_type: "branch",
        pusher_type: "user",
      },
    };
    const result = validateDeleteEvent(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("accepts a valid tag DeleteEvent", () => {
    const event = {
      ...baseEvent,
      type: "DeleteEvent",
      payload: {
        ref: "v1.0.0",
        ref_type: "tag",
        pusher_type: "deploy_key",
      },
    };
    const result = validateDeleteEvent(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("accepts a DeleteEvent with an optional org field", () => {
    const event = {
      ...baseEvent,
      type: "DeleteEvent",
      org: {
        id: 1,
        login: "github",
        url: "https://api.github.com/orgs/github",
      },
      payload: {
        ref: "old-branch",
        ref_type: "branch",
        pusher_type: "user",
      },
    };
    const result = validateDeleteEvent(event);
    expect(result.valid).toBe(true);
  });

  it("rejects a DeleteEvent missing required payload ref", () => {
    const event = {
      ...baseEvent,
      type: "DeleteEvent",
      payload: {
        // ref is missing
        ref_type: "branch",
        pusher_type: "user",
      },
    };
    const result = validateDeleteEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).not.toBeNull();
  });

  it("rejects a DeleteEvent with repository as ref_type (not allowed for delete)", () => {
    const event = {
      ...baseEvent,
      type: "DeleteEvent",
      payload: {
        ref: "main",
        ref_type: "repository", // not in enum for delete
        pusher_type: "user",
      },
    };
    const result = validateDeleteEvent(event);
    expect(result.valid).toBe(false);
  });

  it("rejects a DeleteEvent missing the top-level repo", () => {
    const { repo: _repo, ...eventWithoutRepo } = baseEvent;
    const event = {
      ...eventWithoutRepo,
      type: "DeleteEvent",
      payload: {
        ref: "old-branch",
        ref_type: "branch",
        pusher_type: "user",
      },
    };
    const result = validateDeleteEvent(event);
    expect(result.valid).toBe(false);
  });

  it("rejects a DeleteEvent with actor missing required url", () => {
    const event = {
      ...baseEvent,
      actor: { id: 1, login: "octocat" }, // url missing
      type: "DeleteEvent",
      payload: {
        ref: "old-branch",
        ref_type: "branch",
        pusher_type: "user",
      },
    };
    const result = validateDeleteEvent(event);
    expect(result.valid).toBe(false);
  });
});
