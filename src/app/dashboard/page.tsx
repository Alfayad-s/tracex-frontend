"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  useExpenseSummary,
  useExpenseSummaryByCategory,
} from "@/lib/hooks/use-summary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupee } from "@/lib/utils";
import {
  Receipt,
  FolderTree,
  PiggyBank,
  RefreshCw,
  PieChart as PieChartIcon,
} from "lucide-react";

const PRESETS = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-7", label: "Last 7 days" },
  { id: "last-30", label: "Last 30 days" },
] as const;

function getPresetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "this-month":
      return {
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: format(endOfMonth(today), "yyyy-MM-dd"),
      };
    case "last-month": {
      const last = subMonths(today, 1);
      return {
        from: format(startOfMonth(last), "yyyy-MM-dd"),
        to: format(endOfMonth(last), "yyyy-MM-dd"),
      };
    }
    case "last-7": {
      const end = today;
      const start = subDays(today, 6);
      return {
        from: format(start, "yyyy-MM-dd"),
        to: format(end, "yyyy-MM-dd"),
      };
    }
    case "last-30": {
      const end = today;
      const start = subDays(today, 29);
      return {
        from: format(start, "yyyy-MM-dd"),
        to: format(end, "yyyy-MM-dd"),
      };
    }
    default:
      return getPresetRange("this-month");
  }
}

const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const DURATION_MS = 1200;
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function AnimatedAmount({
  value,
  formatRupee,
  className,
}: {
  value: number;
  formatRupee: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const start = displayRef.current;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION_MS, 1);
      const eased = easeOutCubic(t);
      const next = Math.round((start + (value - start) * eased) * 100) / 100;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span className={className}>{formatRupee(display)}</span>;
}

export default function DashboardPage() {
  const thisMonth = useMemo(
    () => ({
      from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    }),
    []
  );

  const [preset, setPreset] = useState<string>("this-month");
  const [from, setFrom] = useState(thisMonth.from);
  const [to, setTo] = useState(thisMonth.to);

  const appliedRange = useMemo(() => {
    const p = PRESETS.find((x) => x.id === preset);
    if (p) return getPresetRange(preset);
    return { from, to };
  }, [preset, from, to]);

  const { data: summary, isLoading: summaryLoading } = useExpenseSummary(
    appliedRange.from,
    appliedRange.to,
    null
  );
  const { data: summaryByCategory, isLoading: categoryLoading } =
    useExpenseSummaryByCategory(appliedRange.from, appliedRange.to);

  const lastMonthRange = useMemo(() => getPresetRange("last-month"), []);
  const { data: lastMonthSummary } = useExpenseSummary(
    lastMonthRange.from,
    lastMonthRange.to,
    null
  );
  const showComparison =
    preset === "this-month" && summary != null && lastMonthSummary != null;

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const r = getPresetRange(value);
    setFrom(r.from);
    setTo(r.to);
  };

  const categoryChartData = useMemo(() => {
    if (!summaryByCategory?.byCategory?.length) return [];
    return summaryByCategory.byCategory.map((c) => ({
      name: c.category,
      value: c.total,
      count: c.count,
    }));
  }, [summaryByCategory]);

  const isLoading = summaryLoading || categoryLoading;

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Hero: total spent — large type, incrementing animation, generous spacing */}
      <div className="space-y-3 pb-2 md:space-y-4 md:pb-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Total spent
        </p>
        {isLoading ? (
          <div className="bg-muted/60 h-16 w-48 max-w-full animate-pulse rounded md:h-20 md:w-56" />
        ) : (
          <p className="text-6xl leading-none font-bold tracking-tight tabular-nums sm:text-7xl md:text-7xl">
            <AnimatedAmount
              value={summary?.total ?? 0}
              formatRupee={formatRupee}
            />
          </p>
        )}
        <div className="text-muted-foreground flex items-center gap-2 text-sm md:mt-1">
          <span>{summary?.count ?? 0} expenses</span>
          {showComparison && lastMonthSummary != null && (
            <>
              <span>·</span>
              <span>vs {formatRupee(lastMonthSummary.total)} last month</span>
            </>
          )}
        </div>
      </div>

      {/* Total & count — cards on desktop; hidden on mobile (already in hero) */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 hidden shadow-none md:block md:border md:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total spent
            </CardTitle>
            <Receipt className="text-muted-foreground h-4 w-4" aria-hidden />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="bg-muted h-16 w-40 animate-pulse rounded" />
            ) : (
              <p className="text-5xl font-bold tabular-nums md:text-6xl">
                <AnimatedAmount
                  value={summary?.total ?? 0}
                  formatRupee={formatRupee}
                />
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 hidden shadow-none md:block md:border md:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Expense count
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="bg-muted h-8 w-16 animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">{summary?.count ?? 0}</p>
            )}
          </CardContent>
        </Card>
        {showComparison && (
          <Card className="border-border/50 hidden shadow-none sm:col-span-2 md:block md:border md:shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Period comparison
              </CardTitle>
              <CardDescription>This month vs last month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-muted-foreground text-xs">This month</p>
                  <p className="text-xl font-semibold">
                    {formatRupee(summary?.total ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last month</p>
                  <p className="text-xl font-semibold">
                    {formatRupee(lastMonthSummary?.total ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pie chart: filter above graph */}
      <div className="mx-auto max-w-2xl space-y-5 pt-2 md:pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium md:text-base">
              <PieChartIcon
                className="text-muted-foreground h-4 w-4 md:h-5 md:w-5"
                aria-hidden
              />
              Spending by category
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Breakdown for selected range.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="date-preset"
              className="text-muted-foreground text-xs font-medium"
            >
              Period
            </Label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger id="date-preset" className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card className="md:bg-card border-0 bg-transparent shadow-none md:border md:shadow-sm">
          <CardHeader className="sr-only">
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <div className="text-muted-foreground flex h-[280px] items-center justify-center">
                Loading…
              </div>
            ) : !categoryChartData.length ? (
              <div className="text-muted-foreground flex h-[280px] items-center justify-center">
                No data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${percent != null ? (percent * 100).toFixed(0) : 0}%`
                    }
                  >
                    {categoryChartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      value != null ? formatRupee(value) : "",
                      "Total",
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links: compact row on mobile, grid on desktop */}
      <section className="border-border/40 border-t pt-8 md:border-0 md:pt-10">
        <div className="md:border-border/50 md:bg-card md:rounded-lg md:border md:p-5 md:shadow-sm">
          <p className="text-muted-foreground mb-3 hidden text-sm md:block">
            Manage expenses, categories, budgets, and more.
          </p>
          <div className="flex flex-wrap gap-2 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 justify-start gap-2 rounded-lg px-3 md:h-auto md:min-h-[44px] md:flex-col md:py-3"
            >
              <Link href="/dashboard/expenses">
                <Receipt
                  className="text-muted-foreground h-4 w-4 md:h-5 md:w-5"
                  aria-hidden
                />
                Expenses
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 justify-start gap-2 rounded-lg px-3 md:h-auto md:min-h-[44px] md:flex-col md:py-3"
            >
              <Link href="/dashboard/categories">
                <FolderTree
                  className="text-muted-foreground h-4 w-4 md:h-5 md:w-5"
                  aria-hidden
                />
                Categories
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 justify-start gap-2 rounded-lg px-3 md:h-auto md:min-h-[44px] md:flex-col md:py-3"
            >
              <Link href="/dashboard/budgets">
                <PiggyBank
                  className="text-muted-foreground h-4 w-4 md:h-5 md:w-5"
                  aria-hidden
                />
                Budgets
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 justify-start gap-2 rounded-lg px-3 md:h-auto md:min-h-[44px] md:flex-col md:py-3"
            >
              <Link href="/dashboard/recurring">
                <RefreshCw
                  className="text-muted-foreground h-4 w-4 md:h-5 md:w-5"
                  aria-hidden
                />
                Recurring
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
