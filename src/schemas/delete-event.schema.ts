import { createJsonSchema } from "../utils/createJsonSchema";

/**
 * JSON Schema for a GitHub DeleteEvent, generated with {@link createJsonSchema}.
 * The base event structure and shared payload fields are inherited from the
 * core schema via `$ref`, so any change to `core#/$defs/event` or
 * `core#/$defs/payload` automatically applies here.
 */
const deleteEventSchema = createJsonSchema({
  $id: "https://example.com/schemas/delete-event",
  title: "GitHub Delete Event",
  description: "Triggered when a Git branch or tag is deleted",
  eventTypeConst: "DeleteEvent",
  payload: {
    description: "Event-specific payload for a DeleteEvent",
    properties: {
      ref: {
        type: "string",
        description: "The git ref that was deleted",
      },
      ref_type: {
        type: "string",
        enum: ["branch", "tag"],
        description: "The type of Git ref that was deleted",
      },
    },
    required: ["ref", "ref_type", "pusher_type"],
  },
});

export default deleteEventSchema;
