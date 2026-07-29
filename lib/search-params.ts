import { Difficulty, Occupation } from "@prisma/client";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import type { ListFilterLike } from "@/types/admin";

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Normalises admin `searchParams` into a validated filter object. Unknown or
 * malformed values are dropped rather than passed through to Prisma.
 */
export function parseListFilter(params: RawParams): ListFilterLike {
  const occupation = first(params.occupation);
  const difficulty = first(params.difficulty);
  const minScore = first(params.minScore);
  const maxScore = first(params.maxScore);

  return {
    page: toInt(first(params.page), 1, 1, 100_000),
    perPage: toInt(first(params.perPage), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
    q: first(params.q)?.slice(0, 120) || undefined,
    occupation:
      occupation && occupation in Occupation ? (occupation as Occupation) : undefined,
    difficulty:
      difficulty && difficulty in Difficulty ? (difficulty as Difficulty) : undefined,
    status: first(params.status) || undefined,
    from: first(params.from) || undefined,
    to: first(params.to) || undefined,
    minScore: minScore !== undefined && minScore !== "" ? Number(minScore) : undefined,
    maxScore: maxScore !== undefined && maxScore !== "" ? Number(maxScore) : undefined,
  };
}
