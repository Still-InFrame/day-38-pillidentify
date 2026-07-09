import type { z } from "zod";
import type {
  analyzePillImageResponseSchema,
  pillReferenceSchema,
  searchPillMatchesResponseSchema,
} from "./schemas";

export type PillReference = z.infer<typeof pillReferenceSchema>;
export type PillAnalysis = z.infer<typeof analyzePillImageResponseSchema>;
export type SearchPillMatchesResponse = z.infer<
  typeof searchPillMatchesResponseSchema
>;

export type PillMatch = SearchPillMatchesResponse["matches"][number];
