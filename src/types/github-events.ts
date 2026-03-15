export type {
  Actor,
  BasePayload,
  GitHubEvent,
  Organization,
  Repo,
} from "./core";
export type { CreateEvent, CreateEventPayload } from "./create-event";
export type { DeleteEvent, DeleteEventPayload } from "./delete-event";

import type { CreateEvent } from "./create-event";
import type { DeleteEvent } from "./delete-event";

export interface SchemaMap {
  "https://example.com/schemas/create-event": CreateEvent;
  "https://example.com/schemas/delete-event": DeleteEvent;
}
