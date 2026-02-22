"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ExpenseSummary, ExpenseSummaryByCategory } from "@/lib/api/types";

const summaryKey = ["expenses", "summary"] as const;

export function useExpenseSummary(
  from?: string | null,
  to?: string | null,
  groupBy?: "day" | "week" | "month" | null
) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (groupBy) params.groupBy = groupBy;
  return useQuery({
    queryKey: [...summaryKey, from, to, groupBy],
    queryFn: () =>
      api.get<ExpenseSummary>(endpoints.expenseSummary, params as Record<string, string | number | undefined>),
  });
}

export function useExpenseSummaryByCategory(
  from?: string | null,
  to?: string | null
) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: [...summaryKey, "by-category", from, to],
    queryFn: () =>
      api.get<ExpenseSummaryByCategory>(
        endpoints.expenseSummaryByCategory,
        params as Record<string, string | number | undefined>
      ),
  });
}
