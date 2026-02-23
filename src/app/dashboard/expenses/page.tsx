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
  useBulkUpdateExpenses,
  useBulkDeleteExpenses,
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
import { formatRupee } from "@/lib/utils";

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

const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 80;

const SWIPE_HINT_SEEN_KEY = "tracex_swipe_hint_seen";

function SwipeHintDemo({ onDismiss }: { onDismiss: () => void }) {
  const [translateX, setTranslateX] = useState(0);

  useEffect(() => {
    const slideDuration = 400;
    const hold = 1200;
    const t1 = setTimeout(() => setTranslateX(-72), 800);
    const t2 = setTimeout(() => setTranslateX(0), 800 + slideDuration + hold);
    const t3 = setTimeout(
      () => setTranslateX(72),
      800 + (slideDuration + hold) * 2
    );
    const t4 = setTimeout(
      () => setTranslateX(0),
      800 + (slideDuration + hold) * 3
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="border-border/50 bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="border-border/40 bg-muted/20 px-4 py-3">
        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          <span className="text-foreground font-medium">Tip:</span> Swipe left
          to edit, swipe right to delete
        </p>
      </div>
      <div className="relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 flex w-[72px] items-center justify-center bg-red-500">
          <span className="flex flex-col items-center gap-1 text-[10px] font-medium tracking-wider text-white uppercase">
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </span>
        </div>
        <div className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-blue-500">
          <span className="flex flex-col items-center gap-1 text-[10px] font-medium tracking-wider text-white uppercase">
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </span>
        </div>
        <div
          className="bg-card relative z-10 transition-[transform] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{ transform: `translateX(${translateX}px)` }}
        >
          <div className="flex min-w-full items-center gap-3 px-4 py-3">
            <div className="bg-muted/80 h-4 w-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-muted-foreground text-xs">Sample expense</p>
                <p className="text-sm font-semibold tabular-nums">₹0.00</p>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Drag this row to try
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="border-border/40 bg-muted/10 flex justify-center border-t px-4 py-2.5">
        <Button variant="secondary" size="sm" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}

function SwipeableExpenseRow({
  exp,
  onEdit,
  onDelete,
  selectedIds,
  toggleSelected,
  search,
  formatRupee,
  format,
  HighlightMatchComponent,
}: {
  exp: Expense;
  onEdit: () => void;
  onDelete: () => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  search: string | undefined;
  formatRupee: (n: number) => string;
  format: (d: Date, f: string) => string;
  HighlightMatchComponent: React.ComponentType<{ text: string; query: string }>;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startTranslate = useRef(0);
  const currentX = useRef(0);

  const clamp = (v: number) => {
    if (v > 0) return Math.min(v, SWIPE_MAX);
    return Math.max(v, -SWIPE_MAX);
  };

  const handleStart = (clientX: number) => {
    startX.current = clientX;
    startTranslate.current = translateX;
    currentX.current = translateX;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - startX.current;
    const next = clamp(startTranslate.current + delta);
    currentX.current = next;
    setTranslateX(next);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    const x = currentX.current;
    setIsDragging(false);
    setTranslateX(0);
    if (x <= -SWIPE_THRESHOLD) {
      onEdit();
    } else if (x >= SWIPE_THRESHOLD) {
      onDelete();
    }
  };

  return (
    <div className="border-border/40 relative w-full overflow-hidden border-b last:border-b-0">
      {/* Left: Delete */}
      <div className="absolute inset-y-0 left-0 z-0 flex w-[72px] items-center justify-center bg-red-500">
        <span className="flex flex-col items-center gap-1 text-[10px] font-medium tracking-wider text-white uppercase">
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </span>
      </div>
      {/* Right: Edit */}
      <div className="absolute inset-y-0 right-0 z-0 flex w-[72px] items-center justify-center bg-blue-500">
        <span className="flex flex-col items-center gap-1 text-[10px] font-medium tracking-wider text-white uppercase">
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </span>
      </div>
      {/* Sliding content — full width so red/blue panels stay hidden */}
      <div
        className="relative z-10 flex w-full min-w-full shrink-0 items-center transition-[transform] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          transform: `translateX(${translateX}px)`,
          transitionProperty: isDragging ? "none" : "transform",
          touchAction: "pan-y",
        }}
        onTouchStart={(e) => handleStart(e.targetTouches[0].clientX)}
        onTouchMove={(e) => handleMove(e.targetTouches[0].clientX)}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") {
            e.currentTarget.setPointerCapture(e.pointerId);
            handleStart(e.clientX);
          }
        }}
        onPointerMove={(e) => {
          if (
            e.pointerType === "mouse" &&
            e.currentTarget.hasPointerCapture(e.pointerId)
          ) {
            handleMove(e.clientX);
          }
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "mouse") {
            e.currentTarget.releasePointerCapture(e.pointerId);
            handleEnd();
          }
        }}
        onPointerLeave={(e) => {
          if (
            e.pointerType === "mouse" &&
            e.currentTarget.hasPointerCapture(e.pointerId)
          ) {
            handleEnd();
          }
        }}
      >
        <div className="bg-card active:bg-muted/20 flex min-w-full flex-1 items-start gap-3 px-4 py-3.5 transition-colors">
          <input
            type="checkbox"
            checked={selectedIds.has(exp.id)}
            onChange={() => toggleSelected(exp.id)}
            aria-label={`Select expense ${exp.id}`}
            className="border-input mt-0.5 h-4 w-4 shrink-0 rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-muted-foreground text-xs tabular-nums">
                {format(new Date(exp.date), "dd MMM yyyy")} · {exp.category}
              </p>
              <p className="font-semibold tabular-nums">
                {formatRupee(exp.amount)}
              </p>
            </div>
            {exp.description ? (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                <HighlightMatchComponent
                  text={exp.description}
                  query={search ?? ""}
                />
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
      receiptUrl: "",
      currency: "",
    },
  });
  // eslint-disable-next-line react-hooks/incompatible-library -- watch() from react-hook-form is safe here
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
      <div className="grid gap-2">
        <Label htmlFor="exp-receipt">Receipt URL (optional)</Label>
        <Input
          id="exp-receipt"
          type="url"
          {...register("receiptUrl")}
          placeholder="https://..."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="exp-currency">Currency (optional, display only)</Label>
        <Input
          id="exp-currency"
          {...register("currency")}
          placeholder="e.g. INR"
          maxLength={10}
        />
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
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(
      () => setShowSwipeHint(localStorage.getItem(SWIPE_HINT_SEEN_KEY) !== "1"),
      0
    );
    return () => clearTimeout(t);
  }, []);

  const { data: listResponse, isLoading, error } = useExpenses(filters);
  const expenses = listResponse?.data ?? [];
  const pagination = listResponse?.pagination;

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const bulkDeleteMutation = useBulkDeleteExpenses();
  const bulkUpdateMutation = useBulkUpdateExpenses();

  useEffect(() => {
    if (searchParams.get("openCreate") === "1") {
      const url = new URL(window.location.href);
      url.searchParams.delete("openCreate");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
      const t = setTimeout(() => setCreateOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setSearchInput(filters.search ?? ""), 0);
    return () => clearTimeout(t);
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

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkDeleteMutation.mutate(ids, {
      onSuccess: (res) => {
        toast.success(`Deleted ${res?.deleted ?? ids.length} expense(s).`);
        setSelectedIds(new Set());
        setBulkDeleteOpen(false);
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        toast.error(e?.message ?? "Failed to delete some expenses.");
      },
    });
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
        receiptUrl: values.receiptUrl?.trim() || undefined,
        currency: values.currency?.trim() || undefined,
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
          receiptUrl: values.receiptUrl?.trim() || undefined,
          currency: values.currency?.trim() || undefined,
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
        <p className="text-destructive text-base">Failed to load expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full md:hidden"
            onClick={() => setFiltersOpen(true)}
            aria-label={
              hasFilters
                ? `Filters (${[filters.from, filters.to, filters.category, filters.search, filters.minAmount != null, filters.maxAmount != null].filter(Boolean).length} applied)`
                : "Open filters"
            }
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setBulkOpen(true)}
            aria-label="Import expenses"
          >
            <Upload className="h-5 w-5" aria-hidden />
          </Button>
        </div>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setCreateOpen(true)}
          aria-label="Add expense"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Button>
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

      {/* Expense list — clean list style, no card container */}
      <div className="border-border/50 bg-card overflow-hidden rounded-2xl border shadow-sm">
        {isLoading ? (
          <div className="px-4 py-3 md:px-6">
            <div className="space-y-0 md:hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="border-border/40 flex items-center gap-4 border-b py-4 last:border-0"
                >
                  <div className="bg-muted/50 h-4 w-4 shrink-0 animate-pulse rounded" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex justify-between gap-2">
                      <div className="bg-muted/60 h-4 w-16 animate-pulse rounded" />
                      <div className="bg-muted/60 h-4 w-14 animate-pulse rounded" />
                    </div>
                    <div className="bg-muted/60 h-3 w-24 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden min-h-[240px] items-center justify-center md:flex">
              <div className="bg-muted/60 h-6 w-40 animate-pulse rounded-full" />
            </div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 py-16">
            <p className="text-muted-foreground text-sm">No expenses yet.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Add expense
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Import
              </Button>
            </div>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="border-border/40 bg-muted/20 flex flex-wrap items-center gap-3 border-b px-4 py-2.5 md:px-6">
                <span className="text-muted-foreground text-sm">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkEditOpen(true)}
                >
                  Edit selected
                </Button>
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
                  Clear
                </Button>
              </div>
            )}
            {/* Mobile: swipeable list — swipe left = edit, swipe right = delete (with confirmation) */}
            <div className="md:hidden">
              {showSwipeHint === true && (
                <div className="mb-4">
                  <SwipeHintDemo
                    onDismiss={() => {
                      localStorage.setItem(SWIPE_HINT_SEEN_KEY, "1");
                      setShowSwipeHint(false);
                    }}
                  />
                </div>
              )}
              {expenses.map((exp) => (
                <SwipeableExpenseRow
                  key={exp.id}
                  exp={exp}
                  onEdit={() => setEditing(exp)}
                  onDelete={() => setDeleting(exp)}
                  selectedIds={selectedIds}
                  toggleSelected={toggleSelected}
                  search={filters.search ?? undefined}
                  formatRupee={formatRupee}
                  format={format}
                  HighlightMatchComponent={HighlightMatch}
                />
              ))}
            </div>
            {/* Desktop: table as list */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border/50 bg-muted/20 text-muted-foreground border-b text-left text-xs font-medium tracking-wider uppercase">
                    <th className="w-10 px-6 py-3">
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
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="max-w-[220px] px-6 py-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="border-border/40 hover:bg-muted/15 cursor-pointer transition-colors"
                      onClick={() => setEditing(exp)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setDeleting(exp);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEditing(exp);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit expense ${format(new Date(exp.date), "dd MMM yyyy")} ${formatRupee(exp.amount)}. Right-click to delete.`}
                    >
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(exp.id)}
                          onChange={() => toggleSelected(exp.id)}
                          aria-label={`Select expense ${exp.id}`}
                          className="border-input h-4 w-4 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="text-muted-foreground px-6 py-3 tabular-nums">
                        {format(new Date(exp.date), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums">
                        {formatRupee(exp.amount)}
                      </td>
                      <td className="px-6 py-3">{exp.category}</td>
                      <td className="text-muted-foreground max-w-[220px] truncate px-6 py-3">
                        <HighlightMatch
                          text={exp.description ?? "—"}
                          query={filters.search ?? ""}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="border-border/40 bg-muted/10 flex flex-wrap items-center justify-between gap-4 border-t px-4 py-3 md:px-6">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="hidden sm:inline">
                      {" "}
                      · {pagination.total} total
                    </span>
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
                    <SelectTrigger className="h-8 w-[72px]">
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
                  <span className="text-muted-foreground">per page</span>
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
                    Prev
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
      </div>

      {/* Create — bottom sheet */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-border inset-x-0 top-auto bottom-0 flex max-h-[90vh] w-full max-w-full translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-x border-t p-0 shadow-xl data-[state=closed]:animate-[sheet-out-to-bottom_0.3s_cubic-bezier(0.32,0.72,0,1)] data-[state=open]:animate-[sheet-in-from-bottom_0.35s_cubic-bezier(0.32,0.72,0,1)]">
          <div className="bg-muted/30 flex shrink-0 justify-center pt-3 pb-1">
            <div
              className="bg-muted-foreground/30 h-1 w-10 rounded-full"
              aria-hidden
            />
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-1 pb-6">
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
          </div>
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
                receiptUrl: editing.receiptUrl ?? "",
                currency: editing.currency ?? "",
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
        <DialogContent className="border-border inset-auto top-1/2 left-1/2 max-h-[85vh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6">
          <DialogHeader>
            <DialogTitle>Delete expense</DialogTitle>
            <DialogDescription>
              Delete expense on{" "}
              {deleting && format(new Date(deleting.date), "dd MMM yyyy")} for{" "}
              {deleting && formatRupee(deleting.amount)} ({deleting?.category})?
              This cannot be undone.
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
        <DialogContent className="border-border inset-auto top-1/2 left-1/2 max-h-[85vh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6">
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
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting…" : "Delete selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk edit dialog */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        ids={Array.from(selectedIds)}
        onSuccess={() => {
          setSelectedIds(new Set());
          setBulkEditOpen(false);
        }}
        bulkUpdateMutation={bulkUpdateMutation}
        CategorySelect={CategorySelect}
      />

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

function BulkEditDialog({
  open,
  onOpenChange,
  ids,
  onSuccess,
  bulkUpdateMutation,
  CategorySelect: CategorySelectComponent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  onSuccess: () => void;
  bulkUpdateMutation: ReturnType<typeof useBulkUpdateExpenses>;
  CategorySelect: typeof CategorySelect;
}) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ids.length === 0) return;
    const body: Parameters<typeof bulkUpdateMutation.mutate>[0] = { ids };
    if (date.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()))
      body.date = date.trim();
    const am = Number(amount);
    if (amount.trim() !== "" && Number.isFinite(am)) body.amount = am;
    if (category.trim()) body.category = category.trim();
    if (description.trim()) body.description = description.trim();
    if (Object.keys(body).length <= 1) {
      toast.error("Fill at least one field to update.");
      return;
    }
    bulkUpdateMutation.mutate(body, {
      onSuccess: (res) => {
        toast.success(`Updated ${res?.count ?? ids.length} expense(s).`);
        onSuccess();
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        toast.error(e?.message ?? "Bulk update failed.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit {ids.length} expense(s)</DialogTitle>
          <DialogDescription>
            Set fields to apply to all selected. Leave blank to keep current.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="bulk-date">Date</Label>
            <Input
              id="bulk-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bulk-amount">Amount</Label>
            <Input
              id="bulk-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Leave blank to keep"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <CategorySelectComponent
              value={category}
              onValueChange={setCategory}
              label="Category"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bulk-desc">Description</Label>
            <Input
              id="bulk-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Leave blank to keep"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? "Updating…" : "Update selected"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
