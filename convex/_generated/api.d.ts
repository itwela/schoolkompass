/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as classes from "../classes.js";
import type * as flashcardSets from "../flashcardSets.js";
import type * as quizAttempts from "../quizAttempts.js";
import type * as quizzes from "../quizzes.js";
import type * as studyGuides from "../studyGuides.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  classes: typeof classes;
  flashcardSets: typeof flashcardSets;
  quizAttempts: typeof quizAttempts;
  quizzes: typeof quizzes;
  studyGuides: typeof studyGuides;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
