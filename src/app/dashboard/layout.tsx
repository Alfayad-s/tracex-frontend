"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACEX_NEW_EXPENSE_EVENT } from "@/lib/shortcuts";
import { useTheme } from "@/lib/theme-context";

const LORDICON_BASE = "https://cdn.lordicon.com";
const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    lordIcon: `${LORDICON_BASE}/btfbysou.json`,
  },
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    lordIcon: `${LORDICON_BASE}/yraqammt.json`,
  },
  {
    href: "/dashboard/categories",
    label: "Categories",
    lordIcon: `${LORDICON_BASE}/dutqakce.json`,
  },
  {
    href: "/dashboard/budgets",
    label: "Budgets",
    lordIcon: `${LORDICON_BASE}/dnupukmh.json`,
  },
  {
    href: "/dashboard/recurring",
    label: "Recurring",
    lordIcon: `${LORDICON_BASE}/valwmkhs.json`,
  },
  {
    href: "/dashboard/export",
    label: "Export",
    lordIcon: `${LORDICON_BASE}/jqqjtvlf.json`,
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    lordIcon: `${LORDICON_BASE}/bushiqea.json`,
  },
] as const;

const LORDICON_COLORS = {
  light: "primary:#18181b",
  dark: "primary:#fafafa",
} as const;

const SIDEBAR_STORAGE_KEY = "tracex_sidebar_width";
const SIDEBAR_COLLAPSED_KEY = "tracex_sidebar_collapsed";
const SIDEBAR_MIN = 64;
const SIDEBAR_MAX = 320;
const SIDEBAR_DEFAULT = 224;
const SIDEBAR_COLLAPSE_THRESHOLD = 96;
const SIDEBAR_GAP = 16;
const SIDEBAR_TOP_OFFSET = 20;

function NavLordIcon({
  src,
  size = 20,
  colors,
}: {
  src: string;
  size?: number;
  colors: string;
}) {
  return React.createElement("lord-icon", {
    src,
    trigger: "hover",
    colors,
    style: { width: size, height: size, display: "block" },
  } as React.HTMLAttributes<HTMLElement> & {
    src: string;
    trigger: string;
    colors?: string;
  });
}

/** Trigger lord-icon hover animation when parent (e.g. nav item box) is hovered (desktop sidebar). */
function triggerLordIconHover(linkEl: HTMLElement, enter: boolean) {
  const icon = linkEl.querySelector("lord-icon") as HTMLElement | null;
  if (!icon) return;
  if (enter) {
    icon.dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: true, view: window })
    );
    icon.dispatchEvent(
      new PointerEvent("pointerenter", { bubbles: true, view: window })
    );
  } else {
    icon.dispatchEvent(
      new MouseEvent("mouseleave", { bubbles: true, view: window })
    );
    icon.dispatchEvent(
      new PointerEvent("pointerleave", { bubbles: true, view: window })
    );
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const { resolvedDark } = useTheme();
  const pathname = usePathname();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLg, setIsLg] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(SIDEBAR_DEFAULT);
  const resizeStartCollapsed = useRef(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const isCollapsedRef = useRef(isCollapsed);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
    isCollapsedRef.current = isCollapsed;
  }, [sidebarWidth, isCollapsed]);

  const lordIconColors = resolvedDark
    ? LORDICON_COLORS.dark
    : LORDICON_COLORS.light;

  useEffect(() => {
    if (!mounted) return;
    try {
      const w = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      const c = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      queueMicrotask(() => {
        if (w != null) {
          const n = Number(w);
          if (!Number.isNaN(n) && n >= SIDEBAR_MIN && n <= SIDEBAR_MAX)
            setSidebarWidth(n);
        }
        if (c === "1") setIsCollapsed(true);
      });
    } catch {
      /* ignore */
    }
  }, [mounted]);

  useEffect(() => {
    if (!isResizing) return;
    function onMove(e: MouseEvent) {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = resizeStartWidth.current + delta;
      if (resizeStartCollapsed.current) {
        if (newWidth >= SIDEBAR_COLLAPSE_THRESHOLD) {
          setIsCollapsed(false);
          setSidebarWidth(
            Math.min(
              Math.max(newWidth, SIDEBAR_COLLAPSE_THRESHOLD),
              SIDEBAR_MAX
            )
          );
        }
      } else {
        if (newWidth < SIDEBAR_COLLAPSE_THRESHOLD) {
          setIsCollapsed(true);
          setSidebarWidth(SIDEBAR_MIN);
        } else {
          setSidebarWidth(
            Math.min(
              Math.max(newWidth, SIDEBAR_COLLAPSE_THRESHOLD),
              SIDEBAR_MAX
            )
          );
        }
      }
    }
    function onUp() {
      setIsResizing(false);
      try {
        localStorage.setItem(
          SIDEBAR_STORAGE_KEY,
          String(sidebarWidthRef.current)
        );
        localStorage.setItem(
          SIDEBAR_COLLAPSED_KEY,
          isCollapsedRef.current ? "1" : "0"
        );
      } catch {
        /* ignore */
      }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const pageTitle =
    navItems.find((item) => item.href === pathname)?.label ?? "Dashboard";

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    queueMicrotask(() => setIsLg(mq.matches));
    const on = () => setIsLg(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!user) {
      window.location.href = "/signin";
    }
  }, [mounted, user, isLoading]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput =
        /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "") ||
        target?.isContentEditable;
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey && !inInput) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(TRACEX_NEW_EXPENSE_EVENT));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Same loading UI on server and first client render to avoid hydration mismatch.
  if (!mounted || isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="focus:bg-foreground focus:text-background focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:px-3 focus:py-2 focus:ring-2 focus:outline-none"
      >
        Skip to main content
      </a>
      <header
        className="text-foreground border-border/40 bg-background/80 md:border-border md:bg-card sticky top-0 z-10 border-b backdrop-blur-md md:rounded-b-2xl md:backdrop-blur-none"
        role="banner"
      >
        <div className="flex h-14 min-h-[44px] items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:px-6">
          {/* Mobile: hamburger (left) | title (center) | theme (right) — equal width for alignment */}
          <div className="flex min-w-[44px] flex-1 basis-0 items-center justify-start md:min-w-0 md:flex-initial md:basis-auto">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 font-semibold md:flex [&_lord-icon]:block"
              aria-label="TraceX home"
            >
              {React.createElement("lord-icon", {
                src: "https://cdn.lordicon.com/yycecovd.json",
                trigger: "hover",
                colors: lordIconColors,
                style: { width: 24, height: 24, display: "block" },
              })}
              <span className="hidden sm:inline">TraceX</span>
            </Link>
          </div>
          <span className="text-foreground flex flex-1 basis-0 items-center justify-center truncate text-center text-sm font-medium md:hidden">
            {pageTitle}
          </span>
          {/* Top nav: visible on md only; lg+ uses sidebar */}
          <nav
            className="hidden flex-1 items-center gap-1 overflow-x-auto md:flex lg:hidden"
            aria-label="Main navigation"
          >
            {navItems.map(({ href, label, lordIcon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2 [&_lord-icon]:block",
                    pathname === href ? "bg-muted" : ""
                  )}
                >
                  <NavLordIcon
                    src={lordIcon}
                    size={20}
                    colors={lordIconColors}
                  />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </Link>
            ))}
          </nav>
          <div className="flex min-w-[44px] flex-1 basis-0 items-center justify-end gap-1 md:min-w-0 md:flex-1 md:basis-auto md:gap-2">
            <ThemeToggle />
            <span
              className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex"
              title={user.email}
            >
              <User className="h-4 w-4" aria-hidden />
              <span className="max-w-[120px] truncate md:max-w-[180px]">
                {user.email}
              </span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Floating resizable sidebar: desktop (lg+) only */}
        <aside
          className="border-border bg-card hidden lg:fixed lg:z-0 lg:block lg:rounded-xl lg:border lg:shadow-lg"
          style={{
            left: SIDEBAR_GAP,
            top: `calc(3.5rem + ${SIDEBAR_TOP_OFFSET}px)`,
            bottom: SIDEBAR_GAP,
            width: isCollapsed ? SIDEBAR_MIN : sidebarWidth,
            transition: isResizing ? "none" : "width 0.25s ease-out",
          }}
          aria-label="Main navigation"
        >
          <nav
            className={cn(
              "flex h-full flex-col gap-0.5 overflow-x-hidden p-3",
              isCollapsed ? "items-center" : ""
            )}
          >
            {navItems.map(({ href, label, lordIcon }) => (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors [&_lord-icon]:shrink-0",
                  isCollapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-3 px-3 py-2.5",
                  pathname === href ? "bg-muted" : "hover:bg-muted/80"
                )}
                onMouseEnter={(e) =>
                  triggerLordIconHover(e.currentTarget, true)
                }
                onMouseLeave={(e) =>
                  triggerLordIconHover(e.currentTarget, false)
                }
              >
                <NavLordIcon
                  src={lordIcon}
                  size={isCollapsed ? 24 : 22}
                  colors={lordIconColors}
                />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>
          {/* Resize handle: drag left to shrink/collapse, right to expand */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            className="hover:bg-muted/30 absolute top-0 right-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
              resizeStartX.current = e.clientX;
              resizeStartWidth.current = isCollapsed
                ? SIDEBAR_MIN
                : sidebarWidth;
              resizeStartCollapsed.current = isCollapsed;
            }}
          >
            <span className="bg-muted-foreground/40 pointer-events-none h-12 w-0.5 shrink-0 rounded-full" />
          </div>
        </aside>

        {/* Mobile nav overlay: max-lg */}
        {navOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              aria-hidden
              onClick={() => setNavOpen(false)}
            />
            <div
              className="border-border/50 bg-background fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] border-r shadow-xl md:hidden"
              role="dialog"
              aria-label="Main navigation"
            >
              <div className="border-border flex h-14 items-center justify-between border-b px-3">
                <span className="font-semibold">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNavOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav
                className="flex flex-col gap-1 p-3"
                aria-label="Main navigation"
              >
                {navItems.map(({ href, label, lordIcon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setNavOpen(false)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-left font-medium [&_lord-icon]:shrink-0",
                      pathname === href ? "bg-muted" : "hover:bg-muted"
                    )}
                  >
                    <NavLordIcon
                      src={lordIcon}
                      size={24}
                      colors={lordIconColors}
                    />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </>
        )}

        <main
          id="main-content"
          className="min-w-0 flex-1 p-3 pb-28 md:p-6 md:pb-6"
          style={
            isLg
              ? {
                  paddingLeft: `${(isCollapsed ? SIDEBAR_MIN : sidebarWidth) + SIDEBAR_GAP * 2}px`,
                  transition: isResizing
                    ? "none"
                    : "padding-left 0.25s ease-out",
                }
              : undefined
          }
          role="main"
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation: minimal capsule, Expenses | Plus | Budgets */}
      <nav
        className="fixed right-0 bottom-0 left-0 z-30 px-3 pt-4 pb-4 md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="border-border/50 bg-background/80 supports-[backdrop-filter]:bg-background/70 relative flex items-end justify-between rounded-full border py-3 shadow-[0_-1px_0_0_var(--border)] backdrop-blur-md">
          <div className="flex flex-1 items-center justify-center">
            <Link
              href="/dashboard/expenses"
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors active:scale-95 [&_lord-icon]:block",
                pathname === "/dashboard/expenses"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Expenses"
            >
              {React.createElement("lord-icon", {
                src: "https://cdn.lordicon.com/yraqammt.json",
                trigger: "hover",
                colors: lordIconColors,
                style: { width: 36, height: 36 },
              })}
            </Link>
          </div>
          <div className="absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-1/2 justify-center">
            <Link
              href="/dashboard/expenses?openCreate=1"
              className="bg-foreground text-background ring-card flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full shadow-lg ring-4 transition-all hover:opacity-90 active:scale-95 [&_lord-icon]:block"
              aria-label="Create expense"
            >
              {React.createElement("lord-icon", {
                src: "https://cdn.lordicon.com/gzqofmcx.json",
                trigger: "hover",
                colors: "primary:#ffffff",
                style: { width: 30, height: 30 },
              })}
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <Link
              href="/dashboard/budgets"
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors active:scale-95 [&_lord-icon]:block",
                pathname === "/dashboard/budgets"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Budgets"
            >
              {React.createElement("lord-icon", {
                src: "https://cdn.lordicon.com/dnupukmh.json",
                trigger: "hover",
                colors: lordIconColors,
                style: { width: 36, height: 36 },
              })}
            </Link>
          </div>
        </div>
      </nav>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-medium">N</dt>
              <dd className="text-muted-foreground">
                New expense (on Expenses page)
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium">?</dt>
              <dd className="text-muted-foreground">Show this help</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
