import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  Actor,
  CreateEvent,
  CreateEventPayload,
  DeleteEvent,
  DeleteEventPayload,
  GitHubEvent,
  Organization,
  Repo,
} from "../src/types/github-events";

const repositoryRoot = path.resolve(__dirname, "..");

function readGeneratedFile(directory: string, fileName: string): string {
  return fs.readFileSync(path.join(directory, fileName), "utf8");
}

describe("generated type exports", () => {
  it("exposes extracted event types from dedicated files", () => {
    const actor: Actor = {
      id: 1,
      login: "octocat",
      url: "https://api.github.com/users/octocat",
    };

    const repo: Repo = {
      id: 123,
      name: "octocat/Hello-World",
      url: "https://api.github.com/repos/octocat/Hello-World",
    };

    const org: Organization = {
      id: 1,
      login: "github",
      url: "https://api.github.com/orgs/github",
    };

    const createPayload: CreateEventPayload = {
      ref: null,
      ref_type: "repository",
      master_branch: "main",
      pusher_type: "user",
    };

    const createEvent: CreateEvent = {
      id: "1",
      type: "CreateEvent",
      actor,
      repo,
      org,
      public: true,
      created_at: "2022-01-01T00:00:00Z",
      payload: createPayload,
    };

    const deletePayload: DeleteEventPayload = {
      ref: "feature-branch",
      ref_type: "branch",
      pusher_type: "deploy_key",
    };

    const deleteEvent: DeleteEvent = {
      id: "2",
      type: "DeleteEvent",
      actor,
      repo,
      public: false,
      created_at: "2022-01-02T00:00:00Z",
      payload: deletePayload,
    };

    const event: GitHubEvent = createEvent;

    expect(event.actor.login).toBe("octocat");
    expect(createEvent.payload.master_branch).toBe("main");
    expect(deleteEvent.payload.ref).toBe("feature-branch");
    expect(repo.name).toBe("octocat/Hello-World");
    expect(org.login).toBe("github");
  });
});

describe("generate:types script", () => {
  it("keeps the committed generated files in sync with the schemas", () => {
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "json-schema-types-"),
    );

    execFileSync(
      "node",
      [
        path.join(repositoryRoot, "scripts", "generate-types.js"),
        "--output-dir",
        outputDirectory,
      ],
      {
        cwd: repositoryRoot,
        stdio: "pipe",
      },
    );

    expect(readGeneratedFile(outputDirectory, "core.ts")).toBe(
      readGeneratedFile(
        path.join(repositoryRoot, "src", "types", "generated"),
        "core.ts",
      ),
    );
    expect(readGeneratedFile(outputDirectory, "create-event.ts")).toBe(
      readGeneratedFile(
        path.join(repositoryRoot, "src", "types", "generated"),
        "create-event.ts",
      ),
    );
    expect(readGeneratedFile(outputDirectory, "delete-event.ts")).toBe(
      readGeneratedFile(
        path.join(repositoryRoot, "src", "types", "generated"),
        "delete-event.ts",
      ),
    );
    expect(readGeneratedFile(outputDirectory, "create-event.ts")).toContain(
      'import type {EventPayload, GitHubEvent} from "./core";',
    );
  });
});
