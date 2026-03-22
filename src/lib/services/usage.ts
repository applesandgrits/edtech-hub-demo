/**
 * AI usage tracking — meters OpenAI API usage per user.
 * Cap: $0.50 = 500,000 micro-dollars.
 *
 * GPT-4o-mini pricing (per million tokens):
 *   Input:  $0.15
 *   Output: $0.60
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";

/** $0.50 expressed in micro-dollars */
export const USAGE_CAP_MICRODOLLARS = 500_000;

const INPUT_COST_PER_TOKEN = 0.15;
const OUTPUT_COST_PER_TOKEN = 0.60;

export function calculateCostMicrodollars(inputTokens: number, outputTokens: number): number {
  return Math.ceil(inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN);
}

export async function recordUsage(userId: number, inputTokens: number, outputTokens: number): Promise<number> {
  const cost = calculateCostMicrodollars(inputTokens, outputTokens);
  if (cost <= 0) return 0;

  const result = await db
    .update(users)
    .set({ aiUsageMicrodollars: sql`${users.aiUsageMicrodollars} + ${cost}` })
    .where(eq(users.id, userId))
    .returning({ aiUsageMicrodollars: users.aiUsageMicrodollars });

  return result[0]?.aiUsageMicrodollars ?? 0;
}

export function usagePercent(microdollars: number): number {
  return Math.min(100, Math.round((microdollars / USAGE_CAP_MICRODOLLARS) * 100));
}

export async function checkUsageCap(userId: number): Promise<boolean> {
  const result = await db
    .select({ aiUsageMicrodollars: users.aiUsageMicrodollars })
    .from(users)
    .where(eq(users.id, userId));
  return (result[0]?.aiUsageMicrodollars ?? 0) < USAGE_CAP_MICRODOLLARS;
}
