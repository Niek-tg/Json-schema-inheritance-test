import { createJsonSchema } from "../utils/createJsonSchema";

/**
 * JSON Schema for a GitHub CreateEvent, generated with {@link createJsonSchema}.
 * The base event structure and shared payload fields are inherited from the
 * core schema via `$ref`, so any change to `core#/$defs/event` or
 * `core#/$defs/payload` automatically applies here.
 */
const createEventSchema = createJsonSchema({
  $id: "https://example.com/schemas/create-event",
  title: "GitHub Create Event",
  description: "Triggered when a Git branch or tag is created",
  eventTypeConst: "CreateEvent",
  payload: {
    description: "Event-specific payload for a CreateEvent",
    properties: {
      ref_type: {
        type: "string",
        enum: ["repository", "branch", "tag"],
        description: "The type of Git ref that was created",
      },
      master_branch: {
        type: "string",
        description: "The name of the repository's default branch",
      },
      description: {
        type: ["string", "null"],
        description: "The repository's description",
      },
    },
    required: ["ref_type", "master_branch", "pusher_type"],
  },
});

export default createEventSchema;
