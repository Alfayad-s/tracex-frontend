"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format, startOfWeek, endOfDay, subDays, startOfYear } from "date-fns";
import type { ApiErrorPayload } from "@/lib/api/client";
import type { Expense } from "@/lib/api/types";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useBulkCreateExpenses,
  type ExpensesParams,
} from "@/lib/hooks/use-expenses";
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from "@/lib/expenses/schema";
import { CategorySelect } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { TRACEX_NEW_EXPENSE_EVENT } from "@/lib/shortcuts";

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "category", label: "Category" },
  { value: "createdAt", label: "Created" },
] as const;

const PAGE_SIZES = [10, 20, 50] as const;

const SEARCH_DEBOUNCE_MS = 300;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const re = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function getDatePresetRanges(): { label: string; from: string; to: string }[] {
  const now = new Date();
  const today = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfDay(now);
  const last7Start = subDays(now, 6);
  const yearStart = startOfYear(now);
  return [
    {
      label: "This week",
      from: format(weekStart, "yyyy-MM-dd"),
      to: format(weekEnd, "yyyy-MM-dd"),
    },
    {
      label: "Last 7 days",
      from: format(last7Start, "yyyy-MM-dd"),
      to: format(today, "yyyy-MM-dd"),
    },
    {
      label: "This year",
      from: format(yearStart, "yyyy-MM-dd"),
      to: format(today, "yyyy-MM-dd"),
    },
  ];
}

function ExpenseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  defaultValues?: ExpenseFormValues;
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema) as Resolver<ExpenseFormValues>,
    defaultValues: defaultValues ?? {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: 0,
      category: "",
      description: "",
    },
  });
  const category = watch("category");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="exp-date">Date</Label>
        <Input id="exp-date" type="date" {...register("date")} />
        {errors.date && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.date.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="exp-amount">Amount</Label>
        <Input
          id="exp-amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...register("amount")}
        />
        {errors.amount && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.amount.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <CategorySelect
          value={category}
          onValueChange={(v) =>
            setValue("category", v, { shouldValidate: true })
          }
          label="Category"
        />
        {errors.category && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.category.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="exp-desc">Description (optional)</Label>
        <Input id="exp-desc" {...register("description")} placeholder="Notes" />
        {errors.description && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.description.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ExpensesParams>({
    page: 1,
    limit: 20,
    sort: "date",
    order: "desc",
  });
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: listResponse, isLoading, error } = useExpenses(filters);
  const expenses = listResponse?.data ?? [];
  const pagination = listResponse?.pagination;

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  useEffect(() => {
    if (searchParams.get("openCreate") === "1") {
      setCreateOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("openCreate");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchInput(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    function onNewExpense() {
      setCreateOpen(true);
    }
    window.addEventListener(TRACEX_NEW_EXPENSE_EVENT, onNewExpense);
    return () =>
      window.removeEventListener(TRACEX_NEW_EXPENSE_EVENT, onNewExpense);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => {
        const nextSearch = searchInput.trim() || undefined;
        if (prev.search === nextSearch) return prev;
        return { ...prev, search: nextSearch, page: 1 };
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  function applyFilters(updates: Partial<ExpensesParams>) {
    setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      for (const id of ids) {
        await deleteMutation.mutateAsync(id);
      }
      toast.success(`Deleted ${ids.length} expense(s).`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (err) {
      const e = err as unknown as ApiErrorPayload;
      toast.error(e?.message ?? "Failed to delete some expenses.");
    } finally {
      setBulkDeleting(false);
    }
  }

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate =
      selectedIds.size > 0 && selectedIds.size < expenses.length;
  }, [selectedIds.size, expenses.length]);

  const hasFilters = useMemo(() => {
    return !!(
      filters.from ||
      filters.to ||
      filters.category ||
      filters.minAmount != null ||
      filters.maxAmount != null ||
      filters.search
    );
  }, [filters]);

  function handleCreate(values: ExpenseFormValues) {
    createMutation.mutate(
      {
        date: values.date,
        amount: Number(values.amount),
        category: values.category.trim(),
        description: values.description?.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Expense added");
          setCreateOpen(false);
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          toast.error(e?.message ?? "Failed to add expense");
        },
      }
    );
  }

  function handleUpdate(values: ExpenseFormValues) {
    if (!editing) return;
    updateMutation.mutate(
      {
        id: editing.id,
        body: {
          date: values.date,
          amount: Number(values.amount),
          category: values.category.trim(),
          description: values.description?.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Expense updated");
          setEditing(null);
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          if (e?.status === 404) toast.error("Expense not found");
          else toast.error(e?.message ?? "Failed to update expense");
        },
      }
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Expense deleted");
        setDeleting(null);
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        toast.error(e?.message ?? "Failed to delete expense");
      },
    });
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Expenses
        </h1>
        <p className="text-destructive text-base">Failed to load expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Expenses
          </h1>
          <p className="text-muted-foreground text-base">
            View and manage your expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 max-md:flex-col max-md:flex-nowrap">
          <Button
            variant="outline"
            className="max-md:order-last md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
            {hasFilters
              ? `Filters (${[filters.from, filters.to, filters.category, filters.search, filters.minAmount != null, filters.maxAmount != null].filter(Boolean).length})`
              : "Filters"}
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="mr-2 h-4 w-4" aria-hidden />
            Import
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add expense
          </Button>
        </div>
      </div>

      {/* Filters: inline/sidebar on desktop (md+); sheet on mobile (max-md) */}
      <div className="max-md:hidden">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Narrow by date, category, amount, or search.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="filter-from">From</Label>
                <Input
                  id="filter-from"
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(e) =>
                    applyFilters({ from: e.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-to">To</Label>
                <Input
                  id="filter-to"
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(e) =>
                    applyFilters({ to: e.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label
                  className="pointer-events-none block h-0 overflow-hidden opacity-0"
                  aria-hidden
                >
                  Date presets
                </Label>
                <div className="flex flex-wrap gap-3">
                  {getDatePresetRanges().map(({ label, from, to }) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyFilters({ from, to })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-category">Category</Label>
                <CategorySelect
                  id="filter-category"
                  value={filters.category ?? ""}
                  onValueChange={(v) =>
                    applyFilters({ category: v || undefined })
                  }
                  placeholder="All"
                  label=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-search">Search description</Label>
                <Input
                  id="filter-search"
                  placeholder="Search…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-min">Min amount</Label>
                <Input
                  id="filter-min"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={filters.minAmount ?? ""}
                  onChange={(e) =>
                    applyFilters({
                      minAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-max">Max amount</Label>
                <Input
                  id="filter-max"
                  type="number"
                  step="0.01"
                  placeholder="Any"
                  value={filters.maxAmount ?? ""}
                  onChange={(e) =>
                    applyFilters({
                      maxAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sort by</Label>
                <Select
                  value={filters.sort ?? "date"}
                  onValueChange={(v) => applyFilters({ sort: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order</Label>
                <Select
                  value={filters.order ?? "desc"}
                  onValueChange={(v) =>
                    applyFilters({ order: v as "asc" | "desc" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({
                    page: 1,
                    limit: filters.limit ?? 20,
                    sort: "date",
                    order: "desc",
                  })
                }
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile filters sheet (max-md) */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:translate-y-0 max-md:rounded-t-xl">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Narrow by date, category, amount, or search.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sheet-filter-from">From</Label>
                <Input
                  id="sheet-filter-from"
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(e) =>
                    applyFilters({ from: e.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheet-filter-to">To</Label>
                <Input
                  id="sheet-filter-to"
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(e) =>
                    applyFilters({ to: e.target.value || undefined })
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {getDatePresetRanges().map(({ label, from, to }) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyFilters({ from, to })}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelect
                value={filters.category ?? ""}
                onValueChange={(v) =>
                  applyFilters({ category: v || undefined })
                }
                placeholder="All"
                label=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-filter-search">Search</Label>
              <Input
                id="sheet-filter-search"
                placeholder="Search description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sheet-filter-min">Min amount</Label>
                <Input
                  id="sheet-filter-min"
                  type="number"
                  step="0.01"
                  value={filters.minAmount ?? ""}
                  onChange={(e) =>
                    applyFilters({
                      minAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheet-filter-max">Max amount</Label>
                <Input
                  id="sheet-filter-max"
                  type="number"
                  step="0.01"
                  value={filters.maxAmount ?? ""}
                  onChange={(e) =>
                    applyFilters({
                      maxAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort by</Label>
                <Select
                  value={filters.sort ?? "date"}
                  onValueChange={(v) => applyFilters({ sort: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order</Label>
                <Select
                  value={filters.order ?? "desc"}
                  onValueChange={(v) =>
                    applyFilters({ order: v as "asc" | "desc" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({
                    page: 1,
                    limit: filters.limit ?? 20,
                    sort: "date",
                    order: "desc",
                  });
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-3 md:p-0">
              <div className="space-y-2 md:hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="border-border rounded-lg border p-3">
                    <div className="flex justify-between gap-2">
                      <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                      <div className="bg-muted h-4 w-14 animate-pulse rounded" />
                    </div>
                    <div className="bg-muted mt-2 h-3 w-24 animate-pulse rounded" />
                    <div className="bg-muted mt-1 h-3 w-full animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <div className="hidden min-h-[200px] items-center justify-center py-12 md:flex">
                <div className="bg-muted h-8 w-48 animate-pulse rounded" />
              </div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-muted-foreground">No expenses.</p>
              <div className="flex gap-2">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Add expense
                </Button>
                <Button variant="outline" onClick={() => setBulkOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" aria-hidden />
                  Import
                </Button>
              </div>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="border-border flex flex-wrap items-center gap-3 border-b p-3">
                  <span className="text-muted-foreground text-sm">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    Delete selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear selection
                  </Button>
                </div>
              )}
              {/* Mobile: card list */}
              <div className="space-y-2 p-3 md:hidden">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="border-border bg-card rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {new Intl.NumberFormat(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(exp.amount)}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {format(new Date(exp.date), "dd MMM yyyy")} ·{" "}
                          {exp.category}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(exp.id)}
                          onChange={() => toggleSelected(exp.id)}
                          aria-label={`Select expense ${exp.id}`}
                          className="border-input h-4 w-4 rounded"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(exp)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(exp)}
                          aria-label="Delete"
                        >
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {exp.description ? (
                      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                        <HighlightMatch
                          text={exp.description}
                          query={filters.search ?? ""}
                        />
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="w-10 p-3 lg:py-2">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={
                            expenses.length > 0 &&
                            selectedIds.size === expenses.length
                          }
                          onChange={toggleSelectAll}
                          aria-label="Select all on page"
                          className="border-input h-4 w-4 rounded"
                        />
                      </th>
                      <th className="p-3 text-left font-medium lg:py-2">
                        Date
                      </th>
                      <th className="p-3 text-right font-medium lg:py-2">
                        Amount
                      </th>
                      <th className="p-3 text-left font-medium lg:py-2">
                        Category
                      </th>
                      <th className="p-3 text-left font-medium lg:py-2">
                        Description
                      </th>
                      <th
                        className="w-[100px] p-3 lg:py-2"
                        aria-label="Actions"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="border-border hover:bg-muted/50 border-b transition-colors last:border-0"
                      >
                        <td className="p-3 lg:py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(exp.id)}
                            onChange={() => toggleSelected(exp.id)}
                            aria-label={`Select expense ${exp.id}`}
                            className="border-input h-4 w-4 rounded"
                          />
                        </td>
                        <td className="p-3 lg:py-2">
                          {format(new Date(exp.date), "dd MMM yyyy")}
                        </td>
                        <td className="p-3 text-right font-medium lg:py-2">
                          {new Intl.NumberFormat(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(exp.amount)}
                        </td>
                        <td className="p-3 lg:py-2">{exp.category}</td>
                        <td className="text-muted-foreground max-w-[200px] truncate p-3 lg:py-2">
                          <HighlightMatch
                            text={exp.description ?? "—"}
                            query={filters.search ?? ""}
                          />
                        </td>
                        <td className="p-3 lg:py-2">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(exp)}
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleting(exp)}
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 className="text-destructive h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination - show on both mobile and desktop */}
              {pagination && pagination.totalPages > 1 && (
                <div className="border-border flex flex-wrap items-center justify-between gap-4 border-t p-3">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <span>
                      Page {pagination.page} of {pagination.totalPages} (
                      {pagination.total} total)
                    </span>
                    <Select
                      value={String(pagination.limit)}
                      onValueChange={(v) =>
                        setFilters((prev) => ({
                          ...prev,
                          limit: Number(v),
                          page: 1,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    per page
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: (prev.page ?? 1) - 1,
                        }))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: (prev.page ?? 1) + 1,
                        }))
                      }
                    >
                      Next
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>Record a new expense.</DialogDescription>
          </DialogHeader>
          <ExpenseForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            isSubmitting={createMutation.isPending}
            submitLabel="Add"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription>
              Update date, amount, category, or description.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              key={editing.id}
              defaultValues={{
                date: editing.date,
                amount: editing.amount,
                category: editing.category,
                description: editing.description ?? "",
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              isSubmitting={updateMutation.isPending}
              submitLabel="Save"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete expense</DialogTitle>
            <DialogDescription>
              Delete expense on{" "}
              {deleting && format(new Date(deleting.date), "dd MMM yyyy")} for{" "}
              {deleting &&
                new Intl.NumberFormat(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(deleting.amount)}{" "}
              ({deleting?.category})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected expenses</DialogTitle>
            <DialogDescription>
              Delete {selectedIds.size} expense(s)? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Deleting…" : "Delete selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk import dialog */}
      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={(count) => {
          toast.success(`Imported ${count} expense(s).`);
          setBulkOpen(false);
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  );
}

function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (count: number) => void;
  onError: (message: string) => void;
}) {
  const [rawText, setRawText] = useState("");
  const bulkMutation = useBulkCreateExpenses();

  function parseAndSubmit() {
    const lines = rawText
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      onError("Paste at least one line (date, amount, category, description).");
      return;
    }
    const expenses: Array<{
      date: string;
      amount: number;
      category: string;
      description?: string;
    }> = [];
    const errors: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.includes("\t")
        ? line.split("\t")
        : line.split(",").map((p) => p.trim());
      if (parts.length < 3) {
        errors.push(
          `Row ${i + 1}: need date, amount, category (and optional description).`
        );
        continue;
      }
      const [date, amountStr, category, ...descParts] = parts;
      const amount = Number(amountStr);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push(`Row ${i + 1}: date must be YYYY-MM-DD.`);
        continue;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: amount must be a positive number.`);
        continue;
      }
      if (!category?.trim()) {
        errors.push(`Row ${i + 1}: category is required.`);
        continue;
      }
      expenses.push({
        date,
        amount,
        category: category.trim(),
        description: descParts.join(" ").trim() || undefined,
      });
    }
    if (expenses.length > 100) {
      onError("Maximum 100 expenses per import.");
      return;
    }
    if (errors.length > 0) {
      onError(
        errors.slice(0, 5).join(" ") +
          (errors.length > 5 ? ` (+${errors.length - 5} more)` : "")
      );
      return;
    }
    if (expenses.length === 0) {
      onError("No valid rows to import.");
      return;
    }
    bulkMutation.mutate(
      { expenses },
      {
        onSuccess: (data) => {
          const count = Array.isArray(data) ? data.length : 0;
          onSuccess(count);
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          onError(e?.message ?? "Import failed.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import expenses</DialogTitle>
          <DialogDescription>
            Paste one expense per line: date (YYYY-MM-DD), amount, category,
            optional description. Use tab or comma to separate. Max 100.
          </DialogDescription>
        </DialogHeader>
        <textarea
          className="border-input min-h-[200px] w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
          placeholder={
            "2025-02-21\t10.50\tFood\tLunch\n2025-02-22\t25\tTransport"
          }
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          aria-label="Paste expenses"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={parseAndSubmit} disabled={bulkMutation.isPending}>
            {bulkMutation.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
