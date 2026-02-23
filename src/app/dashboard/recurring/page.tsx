"use client";

import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ApiErrorPayload } from "@/lib/api/client";
import type { Recurring } from "@/lib/api/types";
import {
  useRecurring,
  useCreateRecurring,
  useUpdateRecurring,
  useDeleteRecurring,
  useRecurringRun,
} from "@/lib/hooks/use-recurring";
import {
  recurringFormSchema,
  type RecurringFormValues,
} from "@/lib/recurring/schema";
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
import { Plus, Pencil, Trash2, Play } from "lucide-react";
import { formatRupee } from "@/lib/utils";

const FREQUENCIES = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
] as const;

function RecurringRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Recurring;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex flex-row items-center justify-between gap-4">
      <CardContent className="flex flex-1 flex-col gap-1 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div>
          <p className="font-medium">{item.category}</p>
          <p className="text-muted-foreground text-sm">
            {formatRupee(item.amount)} · {item.frequency}
          </p>
        </div>
        {item.description && (
          <p className="text-muted-foreground max-w-[200px] truncate text-sm">
            {item.description}
          </p>
        )}
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>Start: {format(new Date(item.startDate), "dd MMM yyyy")}</span>
          <span>Next: {format(new Date(item.nextRunAt), "dd MMM yyyy")}</span>
          {item.lastRunAt && (
            <span>Last: {format(new Date(item.lastRunAt), "dd MMM yyyy")}</span>
          )}
        </div>
      </CardContent>
      <div className="flex shrink-0 gap-1 pr-4">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="text-destructive h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export default function RecurringPage() {
  const { data: list = [], isLoading, error } = useRecurring();
  const createMutation = useCreateRecurring();
  const updateMutation = useUpdateRecurring();
  const deleteMutation = useDeleteRecurring();
  const runMutation = useRecurringRun();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [deleting, setDeleting] = useState<Recurring | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema) as Resolver<RecurringFormValues>,
    defaultValues: {
      category: "",
      amount: 0,
      description: "",
      frequency: "month",
      startDate: format(new Date(), "yyyy-MM-dd"),
    },
  });
  // eslint-disable-next-line react-hooks/incompatible-library -- watch() from react-hook-form is safe here
  const categoryValue = watch("category");

  useEffect(() => {
    if (editing) {
      reset({
        category: editing.category,
        amount: editing.amount,
        description: editing.description ?? "",
        frequency: editing.frequency,
        startDate: editing.startDate,
      });
    }
  }, [editing, reset]);

  function handleCreate(values: RecurringFormValues) {
    createMutation.mutate(
      {
        category: values.category.trim(),
        amount: Number(values.amount),
        description: values.description?.trim() || undefined,
        frequency: values.frequency,
        startDate: values.startDate,
      },
      {
        onSuccess: () => {
          toast.success("Recurring expense created");
          setCreateOpen(false);
          reset();
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          if (e?.status === 400)
            toast.error(e?.message ?? "Category not found or invalid data");
          else toast.error(e?.message ?? "Failed to create");
        },
      }
    );
  }

  function handleUpdate(values: RecurringFormValues) {
    if (!editing) return;
    updateMutation.mutate(
      {
        id: editing.id,
        body: {
          category: values.category.trim(),
          amount: Number(values.amount),
          description: values.description?.trim() || undefined,
          frequency: values.frequency,
          startDate: values.startDate,
        },
      },
      {
        onSuccess: () => {
          toast.success("Recurring expense updated");
          setEditing(null);
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          if (e?.status === 404) toast.error("Not found");
          else toast.error(e?.message ?? "Failed to update");
        },
      }
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Recurring expense deleted");
        setDeleting(null);
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        toast.error(e?.message ?? "Failed to delete");
      },
    });
  }

  function handleRunNow() {
    runMutation.mutate(undefined, {
      onSuccess: (data) => {
        const count = data?.processed ?? 0;
        const created = data?.created?.length ?? 0;
        toast.success(
          `Run complete: ${count} processed, ${created} expense(s) created.`
        );
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        toast.error(e?.message ?? "Run failed");
      },
    });
  }

  if (error) {
    return (
      <div className="space-y-6">
        <p className="text-destructive text-base">
          Failed to load recurring expenses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRunNow}
            disabled={runMutation.isPending || list.length === 0}
          >
            <Play className="mr-2 h-4 w-4" aria-hidden />
            {runMutation.isPending ? "Running…" : "Run now"}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add recurring
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No recurring expenses</CardTitle>
            <CardDescription>
              Create a recurring expense to automatically add expenses (e.g.
              daily, weekly, or monthly). The backend runs them via cron; you
              can also run now for testing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Create recurring expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <RecurringRow
              key={item.id}
              item={item}
              onEdit={() => setEditing(item)}
              onDelete={() => setDeleting(item)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create recurring expense</DialogTitle>
            <DialogDescription>
              Category must exist. Expenses are created when the backend runs
              (e.g. daily) or when you click Run now.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(handleCreate)}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-2">
              <CategorySelect
                value={categoryValue ?? ""}
                onValueChange={(v) =>
                  setValue("category", v ?? "", { shouldValidate: true })
                }
                label="Category"
              />
              {errors.category && (
                <p className="text-sm text-red-600">
                  {errors.category.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input
                id="rec-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-desc">Description (optional)</Label>
              <Input
                id="rec-desc"
                {...register("description")}
                placeholder="Notes"
              />
              {errors.description && (
                <p className="text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select
                value={watch("frequency")}
                onValueChange={(v) =>
                  setValue("frequency", v as "day" | "week" | "month")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-start">Start date</Label>
              <Input id="rec-start" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-sm text-red-600">
                  {errors.startDate.message}
                </p>
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
            <DialogTitle>Edit recurring expense</DialogTitle>
            <DialogDescription>
              Changing start date can reset next run date.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={handleSubmit(handleUpdate)}
              className="flex flex-col gap-4"
              key={editing.id}
            >
              <div className="grid gap-2">
                <CategorySelect
                  value={watch("category") ?? ""}
                  onValueChange={(v) =>
                    setValue("category", v ?? "", { shouldValidate: true })
                  }
                  label="Category"
                />
                {errors.category && (
                  <p className="text-sm text-red-600">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-rec-amount">Amount</Label>
                <Input
                  id="edit-rec-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("amount")}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-rec-desc">Description (optional)</Label>
                <Input
                  id="edit-rec-desc"
                  {...register("description")}
                  placeholder="Notes"
                />
              </div>
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select
                  value={watch("frequency")}
                  onValueChange={(v) =>
                    setValue("frequency", v as "day" | "week" | "month")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-rec-start">Start date</Label>
                <Input
                  id="edit-rec-start"
                  type="date"
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-600">
                    {errors.startDate.message}
                  </p>
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
            <DialogTitle>Delete recurring expense</DialogTitle>
            <DialogDescription>
              Are you sure? This will stop future expenses from being created.
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
    </div>
  );
}
