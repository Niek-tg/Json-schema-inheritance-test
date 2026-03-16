import { faker } from "@faker-js/faker";
import type { CreateEvent, DeleteEvent, SchemaMap } from "../types/github-events";
import { assertValid } from "../validators/github-event.validator";

export const CREATE_EVENT_SCHEMA_ID =
  "https://example.com/schemas/create-event";
export const DELETE_EVENT_SCHEMA_ID =
  "https://example.com/schemas/delete-event";

type SupportedSchemaId = keyof SchemaMap;
type SchemaInput = SupportedSchemaId | "create-event" | "delete-event";

function randomId(): number {
  return faker.number.int({ min: 1, max: 2_147_483_647 });
}

function buildActor() {
  const login = faker.internet.userName().toLowerCase();

  return {
    id: randomId(),
    login,
    display_login: login,
    url: `https://api.github.com/users/${login}`,
    avatar_url: faker.image.avatarGitHub(),
  };
}

function buildRepo() {
  const owner = faker.internet.userName().toLowerCase();
  const repoName = faker.helpers
    .slugify(faker.word.words({ count: 2 }))
    .toLowerCase();

  return {
    id: randomId(),
    name: `${owner}/${repoName}`,
    url: `https://api.github.com/repos/${owner}/${repoName}`,
  };
}

function buildOrg() {
  const login = faker.internet.userName().toLowerCase();

  return {
    id: randomId(),
    login,
    url: `https://api.github.com/orgs/${login}`,
    repos_url: `https://api.github.com/orgs/${login}/repos`,
    description: faker.datatype.boolean() ? faker.company.catchPhrase() : null,
  };
}

function buildBaseEvent<T extends CreateEvent["type"] | DeleteEvent["type"]>(
  type: T,
) {
  const includeOrg = faker.datatype.boolean();

  return {
    id: faker.string.numeric({ length: 10 }),
    type,
    actor: buildActor(),
    repo: buildRepo(),
    ...(includeOrg ? { org: buildOrg() } : {}),
    public: faker.datatype.boolean(),
    created_at: faker.date.recent().toISOString(),
  };
}

function buildCreateEvent(): CreateEvent {
  const refType = faker.helpers.arrayElement<CreateEvent["payload"]["ref_type"]>([
    "repository",
    "branch",
    "tag",
  ]);

  const ref =
    refType === "repository"
      ? null
      : refType === "branch"
        ? faker.git.branch()
        : `v${faker.system.semver()}`;

  return {
    ...buildBaseEvent("CreateEvent"),
    payload: {
      ref,
      ref_type: refType,
      master_branch: "main",
      description:
        refType === "repository" ? faker.company.catchPhrase() : null,
      pusher_type: faker.helpers.arrayElement(["user", "deploy_key"]),
    },
  };
}

function buildDeleteEvent(): DeleteEvent {
  const refType = faker.helpers.arrayElement<DeleteEvent["payload"]["ref_type"]>([
    "branch",
    "tag",
  ]);

  return {
    ...buildBaseEvent("DeleteEvent"),
    payload: {
      ref:
        refType === "branch"
          ? faker.git.branch()
          : `v${faker.system.semver()}`,
      ref_type: refType,
      pusher_type: faker.helpers.arrayElement(["user", "deploy_key"]),
    },
  };
}

function normalizeSchemaId(input: SchemaInput): SupportedSchemaId {
  if (input === "create-event") {
    return CREATE_EVENT_SCHEMA_ID;
  }
  if (input === "delete-event") {
    return DELETE_EVENT_SCHEMA_ID;
  }
  if (input === CREATE_EVENT_SCHEMA_ID || input === DELETE_EVENT_SCHEMA_ID) {
    return input;
  }

  throw new Error(`Unsupported schema: ${input}`);
}

export function generateCreateEventMock(): CreateEvent {
  return assertValid(CREATE_EVENT_SCHEMA_ID, buildCreateEvent());
}

export function generateDeleteEventMock(): DeleteEvent {
  return assertValid(DELETE_EVENT_SCHEMA_ID, buildDeleteEvent());
}

export function generateMockData<K extends SupportedSchemaId>(
  schemaId: K,
): SchemaMap[K];
export function generateMockData(input: SchemaInput): CreateEvent | DeleteEvent;
export function generateMockData(input: SchemaInput): CreateEvent | DeleteEvent {
  const schemaId = normalizeSchemaId(input);

  if (schemaId === CREATE_EVENT_SCHEMA_ID) {
    return generateCreateEventMock();
  }

  return generateDeleteEventMock();
}

if (require.main === module) {
  const input = process.argv[2] as SchemaInput | undefined;

  if (!input) {
    console.error(
      "Usage: npm run generate:mock -- <create-event|delete-event|schema-id>",
    );
    process.exit(1);
  }

  process.stdout.write(`${JSON.stringify(generateMockData(input), null, 2)}\n`);
}
