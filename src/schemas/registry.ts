/* eslint-disable */
/**
 * This file was automatically generated from the JSON schemas.
 * DO NOT MODIFY IT BY HAND. Instead, update the source schema and rerun
 * npm run generate:types.
 */

import coreSchema from "./core.schema.json";
import createEventSchema from "./create-event.schema.json";
import deleteEventSchema from "./delete-event.schema.json";

export const schemas = [
  coreSchema as object,
  createEventSchema as object,
  deleteEventSchema as object,
] as const;
