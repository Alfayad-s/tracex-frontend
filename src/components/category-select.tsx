"use client";

import * as React from "react";
import { useCategories } from "@/lib/hooks/use-categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategorySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Select populated from GET /api/v1/categories. Use in expense create/edit;
 * only existing categories can be chosen (no free text).
 */
export function CategorySelect({
  value,
  onValueChange,
  placeholder = "Select category",
  disabled = false,
  id,
  label = "Category",
  className,
  "aria-label": ariaLabel,
}: CategorySelectProps) {
  const { data: categories = [], isLoading, error } = useCategories();

  const trigger = (
    <Select
      value={value ?? ""}
      onValueChange={onValueChange}
      disabled={disabled || isLoading}
      aria-label={ariaLabel ?? label}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.name}>
            <span className="flex items-center gap-2">
              {cat.color ? (
                <span
                  className="border-border h-3 w-3 shrink-0 rounded-full border"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden
                />
              ) : (
                <Tag
                  className="text-muted-foreground h-3 w-3 shrink-0"
                  aria-hidden
                />
              )}
              {cat.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (error) {
    return (
      <div className="space-y-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <p className="text-destructive text-sm">Failed to load categories.</p>
      </div>
    );
  }

  if (label) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        {trigger}
      </div>
    );
  }

  return trigger;
}
