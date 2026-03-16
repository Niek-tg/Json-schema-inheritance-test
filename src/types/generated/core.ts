/* eslint-disable */
/**
 * This file was automatically generated from the JSON schemas.
 * DO NOT MODIFY IT BY HAND. Instead, update the source schema and rerun
 * npm run generate:types.
 */

/**
 * Shared vocabulary and definitions for all GitHub activity event schemas
 */
export interface GitHubEventCoreSchema {
  [k: string]: unknown;
}
/**
 * The user or app that triggered the event
 *
 * This interface was referenced by `GitHubEventCoreSchema`'s JSON-Schema
 * via the `definition` "actor".
 */
export interface Actor {
  /**
   * Unique identifier of the actor
   */
  id: number;
  /**
   * Login name of the actor
   */
  login: string;
  /**
   * Display name of the actor
   */
  display_login?: string;
  /**
   * Gravatar ID of the actor
   */
  gravatar_id?: string;
  /**
   * API URL for the actor
   */
  url: string;
  /**
   * URL of the actor's avatar
   */
  avatar_url?: string;
}
/**
 * A GitHub user
 *
 * This interface was referenced by `GitHubEventCoreSchema`'s JSON-Schema
 * via the `definition` "user".
 */
export interface User {
  /**
   * Unique identifier of the user
   */
  id: number;
  /**
   * Login name of the user
   */
  login: string;
  /**
   * Node ID for the user
   */
  node_id?: string;
  /**
   * Type of the user account
   */
  type: "User" | "Organization" | "Bot";
  /**
   * Whether the user is a site administrator
   */
  site_admin?: boolean;
  /**
   * API URL for the user
   */
  url: string;
  /**
   * HTML URL for the user's profile
   */
  html_url?: string;
  /**
   * URL of the user's avatar
   */
  avatar_url?: string;
}
/**
 * A GitHub organization
 *
 * This interface was referenced by `GitHubEventCoreSchema`'s JSON-Schema
 * via the `definition` "organization".
 */
export interface Organization {
  /**
   * Unique identifier of the organization
   */
  id: number;
  /**
   * Login name of the organization
   */
  login: string;
  /**
   * Node ID for the organization
   */
  node_id?: string;
  /**
   * API URL for the organization
   */
  url: string;
  /**
   * URL listing the organization's repositories
   */
  repos_url?: string;
  /**
   * Description of the organization
   */
  description?: string | null;
}
/**
 * A GitHub repository reference in event payloads
 *
 * This interface was referenced by `GitHubEventCoreSchema`'s JSON-Schema
 * via the `definition` "repo".
 */
export interface Repository {
  /**
   * Unique identifier of the repository
   */
  id: number;
  /**
   * Full name of the repository (owner/repo)
   */
  name: string;
  /**
   * API URL for the repository
   */
  url: string;
}
/**
 * Base payload structure shared by GitHub activity events
 *
 * This interface was referenced by `GitHubEventCoreSchema`'s JSON-Schema
 * via the `definition` "payload".
 */
export interface EventPayload {
  /**
   * The git ref (may be null for repository-level events)
   */
  ref?: string | null;
  /**
   * The type of Git ref
   */
  ref_type?: string;
  /**
   * The pusher type for the event
   */
  pusher_type?: "user" | "deploy_key";
  [k: string]: unknown;
}
/**
 * Base structure shared by all GitHub activity events
 *
 * This interface was referenced by `GitHubEventCoreSchema`'s JSON-Schema
 * via the `definition` "event".
 */
export interface GitHubEvent {
  /**
   * Unique identifier of the event
   */
  id: string;
  /**
   * Type of GitHub event
   */
  type: string;
  actor: Actor;
  repo: Repository;
  org?: Organization;
  /**
   * Whether the event is public
   */
  public: boolean;
  /**
   * Timestamp when the event was created
   */
  created_at: string;
  [k: string]: unknown;
}
