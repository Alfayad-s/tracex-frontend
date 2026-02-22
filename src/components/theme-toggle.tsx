"use client";

import { useTheme } from "@/lib/theme-context";
import type { Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [open]);

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Theme options"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative"
      >
        <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </Button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="border-border bg-card absolute top-full right-0 z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border py-1 shadow-lg"
        >
          {options.map((opt) => {
            const isActive = theme === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none",
                  "hover:bg-muted focus:bg-muted",
                  "transition-colors"
                )}
              >
                <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                <span className="flex-1 font-medium">{opt.label}</span>
                {isActive && (
                  <Check className="text-foreground h-4 w-4 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
