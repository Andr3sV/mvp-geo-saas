"use server";

import { getExecutiveMetrics, type ExecutiveMetrics } from "@/lib/queries/executive-overview";
import { SentimentFilterOptions } from "@/lib/queries/sentiment-analysis";

export async function fetchExecutiveMetrics(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<ExecutiveMetrics> {
  return await getExecutiveMetrics(projectId, filters);
}

