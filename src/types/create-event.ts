import type { CreateEvent as GeneratedCreateEvent } from "./generated/create-event";

export type CreateEventPayload = GeneratedCreateEvent["payload"];

export type CreateEvent = GeneratedCreateEvent & {
  type: "CreateEvent";
  payload: CreateEventPayload;
};
