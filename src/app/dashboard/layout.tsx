"use client";

import React, { useEffect, useState } from "react";
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
import { Wallet, LogOut, User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACEX_NEW_EXPENSE_EVENT } from "@/lib/shortcuts";

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

function NavLordIcon({ src, size = 20 }: { src: string; size?: number }) {
  return (
    // lord-icon custom element (Lordicon)
    React.createElement("lord-icon", {
      src,
      trigger: "hover",
      style: { width: size, height: size, display: "block" },
    } as React.HTMLAttributes<HTMLElement> & { src: string; trigger: string })
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.href = "/signin";
    }
  }, [user, isLoading]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
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
        className="border-border bg-card sticky top-0 z-10 border-b"
        role="banner"
      >
        <div className="flex h-14 min-h-[44px] items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:px-6">
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
            className="flex items-center gap-2 font-semibold"
            aria-label="TraceX home"
          >
            <Wallet className="h-6 w-6" aria-hidden />
            <span className="hidden sm:inline">TraceX</span>
          </Link>
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
                  <NavLordIcon src={lordIcon} size={20} />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-1 md:flex-initial md:gap-2">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Persistent sidebar: desktop (lg+) only; overlay hidden below lg */}
        <aside
          className="lg:border-border lg:bg-card hidden lg:fixed lg:top-14 lg:bottom-0 lg:left-0 lg:z-0 lg:block lg:w-56 lg:border-r"
          aria-label="Main navigation"
        >
          <nav className="flex flex-col gap-0.5 p-3">
            {navItems.map(({ href, label, lordIcon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors [&_lord-icon]:shrink-0",
                  pathname === href ? "bg-muted" : "hover:bg-muted/80"
                )}
              >
                <NavLordIcon src={lordIcon} size={22} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile nav overlay: max-lg */}
        {navOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              aria-hidden
              onClick={() => setNavOpen(false)}
            />
            <div
              className="border-border bg-card fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] border-r shadow-lg md:hidden"
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
                    <NavLordIcon src={lordIcon} size={24} />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </>
        )}

        <main
          id="main-content"
          className="min-w-0 flex-1 p-3 pb-28 md:p-6 md:pb-6 lg:pl-56"
          role="main"
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation: capsule bar, Expenses | Plus | Budgets */}
      <nav
        className="fixed right-0 bottom-0 left-0 z-30 px-4 pt-6 pb-4 md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="border-border bg-card/95 supports-[backdrop-filter]:bg-card/90 relative flex items-end justify-between rounded-full border py-3 shadow-lg backdrop-blur">
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
