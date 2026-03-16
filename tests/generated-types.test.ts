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
    const publicTypesPath = path.join(outputDirectory, "public.ts");
    const schemaRegistryPath = path.join(outputDirectory, "registry.ts");

    execFileSync(
      "node",
      [
        path.join(repositoryRoot, "scripts", "generate-types.js"),
        "--output-dir",
        outputDirectory,
        "--public-types-path",
        publicTypesPath,
        "--schema-registry-path",
        schemaRegistryPath,
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
    expect(readGeneratedFile(outputDirectory, "public.ts")).toBe(
      readGeneratedFile(
        path.join(repositoryRoot, "src", "types", "generated"),
        "public.ts",
      ),
    );
    expect(readGeneratedFile(outputDirectory, "registry.ts")).toBe(
      readGeneratedFile(
        path.join(repositoryRoot, "src", "schemas"),
        "registry.ts",
      ),
    );
    expect(readGeneratedFile(outputDirectory, "create-event.ts")).toContain(
      'import type {EventPayload, GitHubEvent} from "./core";',
    );
  });

  it("discovers additional schemas from the schema folder automatically", () => {
    const schemaDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "json-schema-discovery-"),
    );
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "json-schema-types-"),
    );
    const publicTypesPath = path.join(outputDirectory, "public.ts");
    const schemaRegistryPath = path.join(outputDirectory, "registry.ts");

    for (const fileName of fs.readdirSync(
      path.join(repositoryRoot, "src", "schemas"),
    )) {
      if (fileName.endsWith(".schema.json")) {
        fs.copyFileSync(
          path.join(repositoryRoot, "src", "schemas", fileName),
          path.join(schemaDirectory, fileName),
        );
      }
    }

    fs.writeFileSync(
      path.join(schemaDirectory, "fork-event.schema.json"),
      JSON.stringify(
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          $id: "https://example.com/schemas/fork-event",
          title: "GitHub Fork Event",
          description: "Triggered when a repository is forked",
          allOf: [{ $ref: "https://example.com/schemas/core#/$defs/event" }],
          properties: {
            type: {
              type: "string",
              const: "ForkEvent",
            },
            payload: {
              description: "Event-specific payload for a ForkEvent",
              allOf: [
                { $ref: "https://example.com/schemas/core#/$defs/payload" },
              ],
              properties: {
                forkee: {
                  type: "string",
                  description: "The full name of the forked repository",
                },
              },
              required: ["forkee"],
              unevaluatedProperties: false,
            },
          },
          required: ["payload"],
          unevaluatedProperties: false,
        },
        null,
        2,
      ),
    );

    execFileSync(
      "node",
      [
        path.join(repositoryRoot, "scripts", "generate-types.js"),
        "--schema-dir",
        schemaDirectory,
        "--output-dir",
        outputDirectory,
        "--public-types-path",
        publicTypesPath,
        "--schema-registry-path",
        schemaRegistryPath,
      ],
      {
        cwd: repositoryRoot,
        stdio: "pipe",
      },
    );

    expect(readGeneratedFile(outputDirectory, "fork-event.ts")).toContain(
      "export type ForkEvent",
    );
    expect(readGeneratedFile(outputDirectory, "public.ts")).toContain(
      '"https://example.com/schemas/fork-event": ForkEvent;',
    );
    expect(readGeneratedFile(outputDirectory, "public.ts")).toContain(
      "export type ForkEvent = GeneratedForkEvent",
    );
    expect(readGeneratedFile(outputDirectory, "registry.ts")).toContain(
      'import forkEventSchema from "./fork-event.schema.json";',
    );
  });
});
