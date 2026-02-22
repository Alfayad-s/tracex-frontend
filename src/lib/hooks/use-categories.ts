"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Category } from "@/lib/api/types";

const categoriesKey = ["categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: () => api.get<Category[]>(endpoints.categories),
  });
}

export function useCategory(id: string | null) {
  return useQuery({
    queryKey: [...categoriesKey, id],
    queryFn: () => api.get<Category>(endpoints.category(id!)),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color?: string; icon?: string }) =>
      api.post<Category>(endpoints.categories, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name?: string; color?: string | null; icon?: string | null };
    }) => api.patch<Category>(endpoints.category(id), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(endpoints.category(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}
