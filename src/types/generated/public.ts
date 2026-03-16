/* eslint-disable */
/**
 * This file was automatically generated from the JSON schemas.
 * DO NOT MODIFY IT BY HAND. Instead, update the source schema and rerun
 * npm run generate:types.
 */

export type {Actor, EventPayload, EventPayload as BasePayload, GitHubEvent, Organization, Repository, Repository as Repo, User} from "./core";

import type {CreateEvent as GeneratedCreateEvent, CreateEventPayload} from "./create-event";
export type {CreateEventPayload} from "./create-event";
export type CreateEvent = GeneratedCreateEvent & { type: "CreateEvent"; payload: CreateEventPayload; };

import type {DeleteEvent as GeneratedDeleteEvent, DeleteEventPayload} from "./delete-event";
export type {DeleteEventPayload} from "./delete-event";
export type DeleteEvent = GeneratedDeleteEvent & { type: "DeleteEvent"; payload: DeleteEventPayload; };

export interface SchemaMap {
  "https://example.com/schemas/create-event": CreateEvent;
  "https://example.com/schemas/delete-event": DeleteEvent;
}
