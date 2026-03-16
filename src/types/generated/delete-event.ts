import type {EventPayload, GitHubEvent} from "./core";

/* eslint-disable */
/**
 * This file was automatically generated from the JSON schemas.
 * DO NOT MODIFY IT BY HAND. Instead, update the source schema and rerun
 * npm run generate:types.
 */

/**
 * Triggered when a Git branch or tag is deleted
 */
export type DeleteEvent = GitHubEvent & {
  type?: "DeleteEvent";
  /**
   * Event-specific payload for a DeleteEvent
   */
  payload: EventPayload & {
    /**
     * The git ref that was deleted
     */
    ref: string;
    /**
     * The type of Git ref that was deleted
     */
    ref_type: "branch" | "tag";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

export type DeleteEventPayload = DeleteEvent["payload"];
