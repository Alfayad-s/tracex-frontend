"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Recurring, RecurringRunResult } from "@/lib/api/types";

const recurringKey = ["recurring"] as const;

export function useRecurring() {
  return useQuery({
    queryKey: recurringKey,
    queryFn: () => api.get<Recurring[]>(endpoints.recurring),
  });
}

export function useRecurringOne(id: string | null) {
  return useQuery({
    queryKey: [...recurringKey, id],
    queryFn: () => api.get<Recurring>(endpoints.recurringId(id!)),
    enabled: !!id,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      category: string;
      amount: number;
      description?: string;
      frequency: "day" | "week" | "month";
      startDate: string;
    }) => api.post<Recurring>(endpoints.recurring, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKey }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        category?: string;
        amount?: number;
        description?: string;
        frequency?: "day" | "week" | "month";
        startDate?: string;
      };
    }) => api.patch<Recurring>(endpoints.recurringId(id), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKey }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(endpoints.recurringId(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKey }),
  });
}

export function useRecurringRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<RecurringRunResult>(endpoints.recurringRun),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recurringKey });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
