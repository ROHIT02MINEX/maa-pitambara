import type { Difficulty, Occupation } from "@prisma/client";

export type { AdminUserRow, AnalyticsRow, Paginated } from "@/types";

/**
 * The filter shape shared by every admin list view. It is deliberately loose
 * (all fields optional) because it is built from `searchParams`.
 */
export type ListFilterLike = {
  page?: number;
  perPage?: number;
  q?: string;
  occupation?: Occupation;
  difficulty?: Difficulty;
  status?: string;
  from?: string;
  to?: string;
  minScore?: number;
  maxScore?: number;
};

export type ExportFormat = "csv" | "xlsx" | "pdf";
