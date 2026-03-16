import { execFileSync } from "node:child_process";
import {
  CREATE_EVENT_SCHEMA_ID,
  DELETE_EVENT_SCHEMA_ID,
  generateMockData,
} from "../src/generators/mock-generator";
import {
  validateCreateEvent,
  validateDeleteEvent,
} from "../src/validators/github-event.validator";

describe("generateMockData", () => {
  it("generates a valid CreateEvent mock from the create-event schema id", () => {
    const event = generateMockData(CREATE_EVENT_SCHEMA_ID);

    const result = validateCreateEvent(event);

    expect(result.valid).toBe(true);
    expect(event.type).toBe("CreateEvent");
  });

  it("generates a valid DeleteEvent mock from the delete-event schema id", () => {
    const event = generateMockData(DELETE_EVENT_SCHEMA_ID);

    const result = validateDeleteEvent(event);

    expect(result.valid).toBe(true);
    expect(event.type).toBe("DeleteEvent");
  });
});

describe("mock generator CLI", () => {
  it("prints a schema-valid CreateEvent mock for a schema alias", () => {
    const output = execFileSync(
      "node",
      [
        "-r",
        "ts-node/register",
        "src/generators/mock-generator.ts",
        "create-event",
      ],
      {
        cwd: "/home/runner/work/Json-schema-inheritance-test/Json-schema-inheritance-test",
        encoding: "utf8",
      },
    );

    const event = JSON.parse(output);
    const result = validateCreateEvent(event);

    expect(result.valid).toBe(true);
    expect(event.type).toBe("CreateEvent");
  });
});
