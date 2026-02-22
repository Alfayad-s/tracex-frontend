"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ApiErrorPayload } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/lib/hooks/use-categories";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/lib/categories/schema";
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
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPredefined = category.userId === null;
  return (
    <Card className="flex flex-row items-center justify-between gap-4">
      <CardContent className="flex flex-1 flex-row items-center gap-3 py-4">
        {category.color ? (
          <div
            className="border-border h-8 w-8 shrink-0 rounded-md border"
            style={{ backgroundColor: category.color }}
            aria-hidden
          />
        ) : (
          <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
            <Tag className="text-muted-foreground h-4 w-4" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{category.name}</p>
          {category.icon && (
            <p className="text-muted-foreground truncate text-xs">
              {category.icon}
            </p>
          )}
        </div>
        {isPredefined && (
          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
            Default
          </span>
        )}
      </CardContent>
      <div className="flex shrink-0 items-center gap-2 pr-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="Edit category"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {!isPredefined && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Delete category"
          >
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function CategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
  isPredefined = false,
}: {
  defaultValues?: CategoryFormValues;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  /** When true, name is read-only (default categories); only color and icon are sent. */
  isPredefined?: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaultValues ?? { name: "", color: "", icon: "" },
  });
  const color = watch("color");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="cat-name">Name</Label>
        {isPredefined ? (
          <div>
            <p
              id="cat-name"
              className="border-input bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-sm"
            >
              {defaultValues?.name ?? "—"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Default category name cannot be changed. You can only set color
              and icon (stored as your preferences).
            </p>
          </div>
        ) : (
          <>
            <Input
              id="cat-name"
              {...register("name")}
              placeholder="e.g. Food"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </>
        )}
      </div>
      <div className="grid gap-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue("color", c, { shouldValidate: true })}
              className={cn(
                "h-8 w-8 rounded-md border-2 transition-shadow",
                color === c
                  ? "border-foreground ring-foreground ring-2 ring-offset-2"
                  : "border-border hover:border-muted-foreground"
              )}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
        <Input
          {...register("color")}
          placeholder="#hex or leave empty"
          className="mt-1"
        />
        {errors.color && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.color.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cat-icon">Icon (optional)</Label>
        <Input
          id="cat-icon"
          {...register("icon")}
          placeholder="e.g. tag, coffee"
        />
        {errors.icon && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.icon.message}
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

export default function CategoriesPage() {
  const { data: categories = [], isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const hasAnyCategories = categories.length > 0;

  function handleCreate(values: CategoryFormValues) {
    createMutation.mutate(
      {
        name: values.name.trim(),
        color: values.color?.trim() || undefined,
        icon: values.icon?.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Category created");
          setCreateOpen(false);
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          toast.error(e?.message ?? "Failed to create category");
        },
      }
    );
  }

  function handleUpdate(values: CategoryFormValues) {
    if (!editing) return;
    const isPredefined = editing.userId === null;
    const color = values.color?.trim() || null;
    const icon = values.icon?.trim() || null;
    const nameChanged = values.name.trim() !== editing.name;
    const body: { name?: string; color?: string | null; icon?: string | null } =
      { color, icon };
    if (!isPredefined && nameChanged) {
      body.name = values.name.trim();
    }
    const payload = { id: editing.id, body };
    console.log("[Category PATCH] Request", payload);
    updateMutation.mutate(payload, {
      onSuccess: (data) => {
        console.log("[Category PATCH] Response", data);
        toast.success("Category updated");
        setEditing(null);
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        console.log("[Category PATCH] Error", {
          status: e?.status,
          message: e?.message,
          payload,
        });
        if (e?.status === 400) toast.error(e?.message ?? "Invalid update");
        else if (e?.status === 403)
          toast.error("You cannot edit this category");
        else if (e?.status === 404) toast.error("Category not found");
        else toast.error(e?.message ?? "Failed to update category");
      },
    });
  }

  function handleDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Category deleted");
        setDeleting(null);
      },
      onError: (err) => {
        const e = err as unknown as ApiErrorPayload;
        if (e?.status === 403) toast.error("Cannot delete default category");
        else toast.error(e?.message ?? "Failed to delete category");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Categories
          </h1>
          <p className="text-muted-foreground text-base">
            Predefined and your custom categories for expenses.
          </p>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-border flex items-center gap-3 rounded-lg border p-4"
            >
              <div className="bg-muted h-8 w-8 shrink-0 animate-pulse rounded-md" />
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Categories
        </h1>
        <p className="text-destructive text-base">Failed to load categories.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Categories
          </h1>
          <p className="text-muted-foreground text-base">
            Predefined and your custom categories for expenses.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add category
        </Button>
      </div>

      {!hasAnyCategories ? (
        <Card>
          <CardHeader>
            <CardTitle>No categories yet</CardTitle>
            <CardDescription>
              No custom categories yet. Create one to organize your expenses, or
              use the defaults once you add expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Create category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              onEdit={() => setEditing(cat)}
              onDelete={() => setDeleting(cat)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create category</DialogTitle>
            <DialogDescription>
              Add a new category for your expenses.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            isSubmitting={createMutation.isPending}
            submitLabel="Create"
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
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              {editing?.userId === null
                ? "Default category: you can only set color and icon (stored as your preferences)."
                : "Change name, color, or icon."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <CategoryForm
              key={editing.id}
              defaultValues={{
                name: editing.name,
                color: editing.color ?? "",
                icon: editing.icon ?? "",
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              isSubmitting={updateMutation.isPending}
              submitLabel="Save"
              isPredefined={editing.userId === null}
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
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleting?.name}&quot;? This
              cannot be undone.
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
