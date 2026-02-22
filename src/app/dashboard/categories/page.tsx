"use client";

import { useState, useRef, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 80;

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
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const startX = useRef(0);
  const startTranslate = useRef(0);
  const currentX = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const clamp = (v: number) => {
    if (v > 0) return Math.min(v, SWIPE_MAX);
    return Math.max(v, -SWIPE_MAX);
  };

  const handleSwipeStart = (clientX: number) => {
    startX.current = clientX;
    startTranslate.current = translateX;
    currentX.current = translateX;
    setIsDragging(true);
  };

  const handleSwipeMove = (clientX: number) => {
    const delta = clientX - startX.current;
    setTranslateX(clamp(startTranslate.current + delta));
    currentX.current = clamp(startTranslate.current + delta);
  };

  const handleSwipeEnd = () => {
    setIsDragging(false);
    const x = currentX.current;
    setTranslateX(0);
    if (x <= -SWIPE_THRESHOLD) onEdit();
    else if (x >= SWIPE_THRESHOLD) onDelete();
  };

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      )
        return;
      setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [menuOpen]);

  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {category.color ? (
          <div
            className="ring-border/50 h-11 w-11 shrink-0 rounded-xl shadow-inner ring-1 ring-black/5 dark:ring-white/5"
            style={{
              backgroundColor: category.color,
              boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.2), 0 1px 2px 0 rgba(0,0,0,0.06)`,
            }}
            aria-hidden
          />
        ) : (
          <div className="bg-muted/60 ring-border/50 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1">
            <Tag className="text-muted-foreground h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-foreground truncate text-[15px] font-semibold tracking-tight">
            {category.name}
          </p>
          {category.icon ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 truncate text-xs">
              <span className="bg-muted/80 rounded px-1.5 py-0.5 font-medium">
                {category.icon}
              </span>
            </span>
          ) : null}
        </div>
        {isPredefined && (
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase">
            Default
          </span>
        )}
      </div>
      {/* Desktop: floating action menu */}
      <div className="relative hidden shrink-0 md:block">
        <Button
          ref={menuButtonRef}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-full transition-transform hover:scale-110 active:scale-95"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          aria-label="Category actions"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="border-border/50 bg-card animate-in fade-in-0 zoom-in-95 absolute top-full right-0 z-50 mt-1 min-w-[160px] origin-top-right rounded-xl border py-1.5 shadow-lg duration-200"
            role="menu"
          >
            <button
              type="button"
              className="text-foreground hover:bg-primary/10 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              role="menuitem"
            >
              <span className="bg-primary/20 text-primary flex h-7 w-7 items-center justify-center rounded-lg">
                <Pencil className="h-3.5 w-3.5" />
              </span>
              Edit
            </button>
            {!isPredefined && (
              <button
                type="button"
                className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                role="menuitem"
              >
                <span className="bg-destructive/15 flex h-7 w-7 items-center justify-center rounded-lg">
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="border-border/30 relative w-full overflow-hidden border-b last:border-b-0 md:overflow-visible">
      {/* Mobile: swipe panels */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-[72px] md:hidden"
        aria-hidden
      >
        <div className="flex h-full w-full items-center justify-center bg-red-500">
          <span className="flex flex-col items-center gap-1 text-[10px] font-semibold tracking-wider text-white uppercase">
            <Trash2 className="h-4 w-4" />
            Delete
          </span>
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[72px] md:hidden"
        aria-hidden
      >
        <div className="flex h-full w-full items-center justify-center bg-blue-500">
          <span className="flex flex-col items-center gap-1 text-[10px] font-semibold tracking-wider text-white uppercase">
            <Pencil className="h-4 w-4" />
            Edit
          </span>
        </div>
      </div>
      {/* Sliding row: mobile swipe, desktop static — full width so panels stay hidden */}
      <div
        className={cn(
          "bg-card relative z-10 flex w-full min-w-full shrink-0 items-center px-5 py-4 transition-all duration-200 md:translate-x-0 md:transition-none",
          "hover:bg-muted/10"
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.3s cubic-bezier(0.25,0.1,0.25,1)",
          touchAction: "pan-y",
        }}
        onTouchStart={(e) => handleSwipeStart(e.targetTouches[0].clientX)}
        onTouchMove={(e) => handleSwipeMove(e.targetTouches[0].clientX)}
        onTouchEnd={handleSwipeEnd}
        onTouchCancel={handleSwipeEnd}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          handleSwipeStart(e.clientX);
        }}
        onPointerMove={(e) => {
          if (
            e.pointerType !== "mouse" ||
            !e.currentTarget.hasPointerCapture(e.pointerId)
          )
            return;
          handleSwipeMove(e.clientX);
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "mouse") return;
          e.currentTarget.releasePointerCapture(e.pointerId);
          handleSwipeEnd();
        }}
        onPointerLeave={(e) => {
          if (
            e.pointerType === "mouse" &&
            e.currentTarget.hasPointerCapture(e.pointerId)
          ) {
            handleSwipeEnd();
          }
        }}
      >
        {content}
      </div>
    </div>
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label
          htmlFor="cat-name"
          className="text-foreground text-sm font-medium"
        >
          Name
        </Label>
        {isPredefined ? (
          <div>
            <p
              id="cat-name"
              className="bg-muted/40 text-foreground border-border/50 rounded-xl border px-4 py-3 text-sm"
            >
              {defaultValues?.name ?? "—"}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Default category name cannot be changed. You can only set color
              and icon (stored as your preferences).
            </p>
          </div>
        ) : (
          <>
            <Input
              id="cat-name"
              {...register("name")}
              placeholder="e.g. Food, Transport"
              autoFocus
              className="border-border/60 rounded-xl"
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </>
        )}
      </div>
      <div className="grid gap-2">
        <Label className="text-foreground text-sm font-medium">Color</Label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue("color", c, { shouldValidate: true })}
              className={cn(
                "h-10 w-10 rounded-xl border-2 transition-all duration-200",
                color === c
                  ? "border-foreground ring-foreground ring-offset-background scale-105 ring-2 ring-offset-2"
                  : "border-transparent hover:scale-105 hover:opacity-90"
              )}
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 2px 8px ${c}40` : undefined,
              }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
        <Input
          {...register("color")}
          placeholder="#hex or leave empty"
          className="border-border/60 mt-1 rounded-xl"
        />
        {errors.color && (
          <p className="text-destructive text-sm">{errors.color.message}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label
          htmlFor="cat-icon"
          className="text-foreground text-sm font-medium"
        >
          Icon{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="cat-icon"
          {...register("icon")}
          placeholder="e.g. tag, coffee"
          className="border-border/60 rounded-xl"
        />
        {errors.icon && (
          <p className="text-destructive text-sm">{errors.icon.message}</p>
        )}
      </div>
      <DialogFooter className="gap-2 pt-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="rounded-xl">
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
    updateMutation.mutate(
      { id: editing.id, body },
      {
        onSuccess: () => {
          toast.success("Category updated");
          setEditing(null);
        },
        onError: (err) => {
          const e = err as unknown as ApiErrorPayload;
          if (e?.status === 400) toast.error(e?.message ?? "Invalid update");
          else if (e?.status === 403)
            toast.error("You cannot edit this category");
          else if (e?.status === 404) toast.error("Category not found");
          else toast.error(e?.message ?? "Failed to update category");
        },
      }
    );
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
      <div className="space-y-5">
        <div className="flex justify-end">
          <div className="bg-muted/40 h-10 w-32 animate-pulse rounded-xl" />
        </div>
        <div className="border-border/40 bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="border-border/30 flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
            >
              <div className="bg-muted/40 h-11 w-11 shrink-0 animate-pulse rounded-xl" />
              <div className="space-y-2">
                <div className="bg-muted/40 h-4 w-32 animate-pulse rounded-md" />
                <div className="bg-muted/30 h-3 w-20 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-border/40 bg-card rounded-2xl border px-6 py-8 text-center shadow-sm">
        <p className="text-destructive text-sm font-semibold">
          Failed to load categories.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          variant="default"
          size="sm"
          className="rounded-xl shadow-sm transition-all hover:shadow"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add category
        </Button>
      </div>

      {!hasAnyCategories ? (
        <div className="border-border/40 from-muted/30 to-muted/10 flex flex-col items-center justify-center rounded-2xl border border-dashed bg-gradient-to-b px-6 py-14 text-center">
          <div className="bg-primary/10 text-primary ring-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
            <Tag className="h-7 w-7" aria-hidden />
          </div>
          <p className="text-foreground text-lg font-semibold tracking-tight">
            No categories yet
          </p>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
            Create a category to organize your expenses, or use defaults when
            you add expenses.
          </p>
          <Button
            className="mt-6 rounded-xl shadow-sm"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Create category
          </Button>
        </div>
      ) : (
        <div className="border-border/40 bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.2)]">
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
        <DialogContent className="border-border/50 rounded-2xl border p-6 shadow-xl sm:max-w-md">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg">Create category</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Add a new category to organize your expenses.
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
        <DialogContent className="border-border/50 rounded-2xl border p-6 shadow-xl sm:max-w-md">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg">Edit category</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
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

      {/* Delete confirm — compact modal */}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="border-border/50 inset-auto top-1/2 left-1/2 max-h-[85vh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg">Delete category</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Delete &quot;{deleting?.name}&quot;? This cannot be undone.
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
