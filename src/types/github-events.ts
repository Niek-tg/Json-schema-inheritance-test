/**
 * TypeScript types derived from the JSON Schema definitions.
 * These types mirror the structure defined in the JSON schemas
 * and are used by assertValid to provide full type inference.
 */

// ---------------------------------------------------------------------------
// Core $defs types (from core.schema.json)
// ---------------------------------------------------------------------------

export interface Actor {
  id: number;
  login: string;
  display_login?: string;
  gravatar_id?: string;
  url: string;
  avatar_url?: string;
}

export interface Organization {
  id: number;
  login: string;
  node_id?: string;
  url: string;
  repos_url?: string;
  description?: string | null;
}

export interface Repo {
  id: number;
  name: string;
  url: string;
}

export interface BasePayload {
  ref?: string | null;
  ref_type?: string;
  pusher_type?: "user" | "deploy_key";
}

export interface GitHubEvent {
  id: string;
  type: string;
  actor: Actor;
  repo: Repo;
  org?: Organization;
  public: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// CreateEvent (from create-event.schema.json)
// ---------------------------------------------------------------------------

export interface CreateEventPayload extends BasePayload {
  ref_type: "repository" | "branch" | "tag";
  master_branch: string;
  pusher_type: "user" | "deploy_key";
  description?: string | null;
}

export interface CreateEvent extends GitHubEvent {
  type: "CreateEvent";
  payload: CreateEventPayload;
}

// ---------------------------------------------------------------------------
// DeleteEvent (from delete-event.schema.json)
// ---------------------------------------------------------------------------

export interface DeleteEventPayload extends BasePayload {
  ref: string;
  ref_type: "branch" | "tag";
  pusher_type: "user" | "deploy_key";
}

export interface DeleteEvent extends GitHubEvent {
  type: "DeleteEvent";
  payload: DeleteEventPayload;
}

// ---------------------------------------------------------------------------
// Schema-to-type mapping for assertValid
// ---------------------------------------------------------------------------

export interface SchemaMap {
  "https://example.com/schemas/create-event": CreateEvent;
  "https://example.com/schemas/delete-event": DeleteEvent;
}
