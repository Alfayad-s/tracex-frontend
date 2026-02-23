"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { getPublic } from "@/lib/api/client";
import type {
  Budget,
  BudgetCompare,
  BudgetWithSpending,
} from "@/lib/api/types";

const budgetsKey = ["budgets"] as const;

export function useBudgets(includeSpending = false) {
  return useQuery({
    queryKey: [...budgetsKey, includeSpending],
    queryFn: () =>
      api.get<BudgetWithSpending[]>(endpoints.budgets, {
        includeSpending: includeSpending ? "true" : undefined,
      }),
  });
}

export function useBudget(id: string | null) {
  return useQuery({
    queryKey: [...budgetsKey, id],
    queryFn: () => api.get<Budget>(endpoints.budget(id!)),
    enabled: !!id,
  });
}

export function useBudgetCompare(id: string | null) {
  return useQuery({
    queryKey: [...budgetsKey, "compare", id],
    queryFn: () => api.get<BudgetCompare>(endpoints.budgetCompare(id!)),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      category?: string;
      year: number;
      month?: number;
      limit: number;
      shareSlug?: string | null;
    }) => api.post<Budget>(endpoints.budgets, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetsKey }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        category?: string;
        year?: number;
        month?: number;
        limit?: number;
        shareSlug?: string | null;
      };
    }) => api.patch<Budget>(endpoints.budget(id), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetsKey }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(endpoints.budget(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetsKey }),
  });
}

export function usePublicBudget(slug: string | null) {
  return useQuery({
    queryKey: ["public", "budgets", slug],
    queryFn: () => getPublic<BudgetCompare>(endpoints.publicBudget(slug!)),
    enabled: !!slug?.trim(),
  });
}
