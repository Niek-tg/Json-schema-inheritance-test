import type { DeleteEvent as GeneratedDeleteEvent } from "./generated/delete-event";

export type DeleteEventPayload = GeneratedDeleteEvent["payload"];

export type DeleteEvent = GeneratedDeleteEvent & {
  type: "DeleteEvent";
  payload: DeleteEventPayload;
};
