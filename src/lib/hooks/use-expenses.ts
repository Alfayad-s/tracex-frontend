"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Expense } from "@/lib/api/types";

export interface ExpensesParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

const expensesKey = ["expenses"] as const;
const summaryKey = ["expenses", "summary"] as const;

function expensesQueryKey(params: ExpensesParams) {
  return [...expensesKey, params] as const;
}

export function useExpenses(params: ExpensesParams = {}) {
  return useQuery({
    queryKey: expensesQueryKey(params),
    queryFn: () =>
      api.getList<Expense>(endpoints.expenses, params as Record<string, string | number | undefined>),
  });
}

export function useExpense(id: string | null) {
  return useQuery({
    queryKey: [...expensesKey, id],
    queryFn: () => api.get<Expense>(endpoints.expense(id!)),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      date: string;
      amount: number;
      category: string;
      description?: string;
    }) => api.post<Expense>(endpoints.expenses, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expensesKey });
      qc.invalidateQueries({ queryKey: summaryKey });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { date?: string; amount?: number; category?: string; description?: string };
    }) => api.patch<Expense>(endpoints.expense(id), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expensesKey });
      qc.invalidateQueries({ queryKey: summaryKey });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(endpoints.expense(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expensesKey });
      qc.invalidateQueries({ queryKey: summaryKey });
    },
  });
}

export function useRestoreExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Expense>(endpoints.expenseRestore(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesKey }),
  });
}

export function useBulkCreateExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { expenses: Array<{ date: string; amount: number; category: string; description?: string }> }) =>
      api.post<Expense[]>(endpoints.expenseBulk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expensesKey });
      qc.invalidateQueries({ queryKey: summaryKey });
    },
  });
}
