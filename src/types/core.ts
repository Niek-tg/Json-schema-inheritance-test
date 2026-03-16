import type {
  Actor as GeneratedActor,
  EventPayload as GeneratedBasePayload,
  GitHubEvent as GeneratedGitHubEvent,
  Organization as GeneratedOrganization,
  Repository as GeneratedRepo,
} from "./generated/core";

export type Actor = GeneratedActor;
export type Organization = GeneratedOrganization;
export type Repo = GeneratedRepo;
export type BasePayload = GeneratedBasePayload;
export type GitHubEvent = GeneratedGitHubEvent;
