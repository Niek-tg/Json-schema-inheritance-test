import type {EventPayload, GitHubEvent} from "./core";

/* eslint-disable */
/**
 * This file was automatically generated from the JSON schemas.
 * DO NOT MODIFY IT BY HAND. Instead, update the source schema and rerun
 * npm run generate:types.
 */

/**
 * Triggered when a Git branch or tag is created
 */
export type CreateEvent = GitHubEvent & {
  type?: "CreateEvent";
  /**
   * Event-specific payload for a CreateEvent
   */
  payload: EventPayload & {
    /**
     * The type of Git ref that was created
     */
    ref_type: "repository" | "branch" | "tag";
    /**
     * The name of the repository's default branch
     */
    master_branch: string;
    /**
     * The repository's description
     */
    description?: string | null;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

export type CreateEventPayload = CreateEvent["payload"];
