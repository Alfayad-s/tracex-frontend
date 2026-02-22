"use client";

import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ApiErrorPayload } from "@/lib/api/client";
import type { Budget } from "@/lib/api/types";
import {
  useBudgets,
  useBudgetCompare,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from "@/lib/hooks/use-budgets";
import { budgetFormSchema, type BudgetFormValues } from "@/lib/budgets/schema";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn, formatRupee } from "@/lib/utils";

const MONTHS = [
  { value: 0, label: "Yearly" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2000, i), "MMMM"),
  })),
];

function BudgetCompareCard({ budgetId }: { budgetId: string }) {
  const { data: compare, isLoading } = useBudgetCompare(budgetId);
  if (isLoading || !compare) {
    return <div className="bg-muted h-16 animate-pulse rounded-md" />;
  }
  const { spending, limit, remaining, percentUsed, expenseCount } = compare;
  const pct = Math.min(percentUsed, 100);
  const barColor =
    percentUsed > 100
      ? "bg-red-500"
      : percentUsed >= 80
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {formatRupee(spending)} / {formatRupee(limit)}
        </span>
        <span
          className={cn(
            "font-medium",
            percentUsed > 100 ? "text-red-600" : "text-muted-foreground"
          )}
        >
          {percentUsed.toFixed(0)}% used
        </span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
          role="progressbar"
          aria-valuenow={percentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {remaining >= 0 ? `${formatRupee(remaining)} remaining` : "Over budget"}{" "}
        · {expenseCount} expense(s)
      </p>
    </div>
  );
}

function BudgetRow({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const periodLabel = budget.month
    ? `${format(new Date(budget.year, (budget.month ?? 1) - 1), "MMM yyyy")}`
    : `Year ${budget.year}`;
  const categoryLabel =
    budget.category && budget.category.trim() ? budget.category : "Overall";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base">{categoryLabel}</CardTitle>
          <CardDescription>
            {periodLabel} · Limit: {formatRupee(budget.limit)}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label="Edit budget"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Delete budget"
          >
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <BudgetCompareCard budgetId={budget.id} />
      </CardContent>
    </Card>
  );
}

export default function BudgetsPage() {
  const { data: budgets = [], isLoading, error } = useBudgets();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema) as Resolver<BudgetFormValues>,
    defaultValues: {
      category: "",
      year: new Date().getFullYear(),
      month: 0,
      limit: 0,
    },
  });
  const category = watch("category");

  useEffect(() => {
    if (editing) {
      reset({
        category: editing.category ?? "",
        year: editing.year,
        month: editing.month ?? 0,
        limit: editing.limit,
      });
    }
  }, [editing, reset]);

  function handleCreate(values: BudgetFormValues) {
    createMutation.mutate(
      {
        category: values.category?.trim() || undefined,
        year: values.year,
        month: values.month === 0 ? undefined : values.month,
        limit: values.limit,
      },
      {
        onSuccess: () => {
          toast.success("Budget created");
          setCreateOpen(false);
          reset();
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          if (e?.status === 400)
            toast.error(e?.message ?? "Duplicate period or invalid data");
          else toast.error(e?.message ?? "Failed to create budget");
        },
      }
    );
  }

  function handleUpdate(values: BudgetFormValues) {
    if (!editing) return;
    updateMutation.mutate(
      {
        id: editing.id,
        body: {
          category: values.category?.trim() || undefined,
          year: values.year,
          month: values.month === 0 ? undefined : values.month,
          limit: values.limit,
        },
      },
      {
        onSuccess: () => {
          toast.success("Budget updated");
          setEditing(null);
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          if (e?.status === 404) toast.error("Budget not found");
          else toast.error(e?.message ?? "Failed to update budget");
        },
      }
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Budget deleted");
        setDeleting(null);
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        toast.error(e?.message ?? "Failed to delete budget");
      },
    });
  }

  if (error) {
    return (
      <div className="space-y-6">
        <p className="text-destructive text-base">Failed to load budgets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add budget
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border-border flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="bg-muted h-8 w-20 animate-pulse rounded" />
                  <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
                  <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : budgets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No budgets yet</CardTitle>
            <CardDescription>
              Create a budget to track spending against a limit (overall or per
              category).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Create budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => (
            <BudgetRow
              key={b.id}
              budget={b}
              onEdit={() => setEditing(b)}
              onDelete={() => setDeleting(b)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create budget</DialogTitle>
            <DialogDescription>
              Set a spending limit for a category and period.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(handleCreate)}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-2">
              <Label>Category (optional = overall)</Label>
              <CategorySelect
                value={category || ""}
                onValueChange={(v) =>
                  setValue("category", v || "", { shouldValidate: true })
                }
                placeholder="Overall"
                label=""
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="budget-year">Year</Label>
                <Input
                  id="budget-year"
                  type="number"
                  min={2000}
                  max={2100}
                  {...register("year")}
                />
                {errors.year && (
                  <p className="text-sm text-red-600">{errors.year.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Month</Label>
                <Select
                  value={String(watch("month"))}
                  onValueChange={(v) => setValue("month", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budget-limit">Limit</Label>
              <Input
                id="budget-limit"
                type="number"
                step="0.01"
                min="0"
                {...register("limit")}
              />
              {errors.limit && (
                <p className="text-sm text-red-600">{errors.limit.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit budget</DialogTitle>
            <DialogDescription>
              Update category, period, or limit.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={handleSubmit(handleUpdate)}
              className="flex flex-col gap-4"
              key={editing.id}
            >
              <div className="grid gap-2">
                <Label>Category (optional = overall)</Label>
                <CategorySelect
                  value={watch("category") || ""}
                  onValueChange={(v) =>
                    setValue("category", v || "", { shouldValidate: true })
                  }
                  placeholder="Overall"
                  label=""
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-year">Year</Label>
                  <Input
                    id="edit-year"
                    type="number"
                    min={2000}
                    max={2100}
                    {...register("year")}
                  />
                  {errors.year && (
                    <p className="text-sm text-red-600">
                      {errors.year.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Month</Label>
                  <Select
                    value={String(watch("month"))}
                    onValueChange={(v) => setValue("month", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-limit">Limit</Label>
                <Input
                  id="edit-limit"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("limit")}
                />
                {errors.limit && (
                  <p className="text-sm text-red-600">{errors.limit.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
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
            <DialogTitle>Delete budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this budget? This cannot be
              undone.
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
    </div>
  );
}
