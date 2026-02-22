"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  FolderTree,
  PiggyBank,
  RefreshCw,
  TrendingUp,
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
  const { data: summaryByPeriod, isLoading: periodLoading } = useExpenseSummary(
    appliedRange.from,
    appliedRange.to,
    "month"
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

  const chartData = useMemo(() => {
    if (!summaryByPeriod?.byPeriod?.length) return [];
    return summaryByPeriod.byPeriod.map((p) => ({
      period: format(new Date(p.period), "MMM yyyy"),
      total: p.total,
      count: p.count,
    }));
  }, [summaryByPeriod]);

  const categoryChartData = useMemo(() => {
    if (!summaryByCategory?.byCategory?.length) return [];
    return summaryByCategory.byCategory.map((c) => ({
      name: c.category,
      value: c.total,
      count: c.count,
    }));
  }, [summaryByCategory]);

  const isLoading = summaryLoading || periodLoading || categoryLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-base">
            Spending overview and trends.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="date-preset">Period</Label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger id="date-preset" className="w-[140px]">
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
          <div className="flex items-center gap-2">
            <div className="space-y-2">
              <Label htmlFor="date-from" className="sr-only">
                From
              </Label>
              <Input
                id="date-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset("");
                }}
              />
            </div>
            <span className="text-muted-foreground">–</span>
            <div className="space-y-2">
              <Label htmlFor="date-to" className="sr-only">
                To
              </Label>
              <Input
                id="date-to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset("");
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Total & count */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total spent
            </CardTitle>
            <Receipt className="text-muted-foreground h-4 w-4" aria-hidden />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="bg-muted h-8 w-24 animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(summary?.total ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
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
          <Card className="sm:col-span-2">
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
                    {new Intl.NumberFormat(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(summary?.total ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last month</p>
                  <p className="text-xl font-semibold">
                    {new Intl.NumberFormat(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(lastMonthSummary?.total ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts: full width on mobile, 2 cols from lg; optional max-width on desktop */}
      <div className="grid gap-6 lg:max-w-6xl lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" aria-hidden />
              Spending over time
            </CardTitle>
            <CardDescription>By month in selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            {periodLoading ? (
              <div className="text-muted-foreground flex h-[280px] items-center justify-center">
                Loading…
              </div>
            ) : !chartData.length ? (
              <div className="text-muted-foreground flex h-[280px] items-center justify-center">
                No data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => String(v)}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      value != null
                        ? new Intl.NumberFormat(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(value)
                        : "",
                      "Total",
                    ]}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Bar
                    dataKey="total"
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                    name="Total"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-5 w-5" aria-hidden />
              Spending by category
            </CardTitle>
            <CardDescription>Breakdown for selected range.</CardDescription>
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
                      value != null
                        ? new Intl.NumberFormat(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(value)
                        : "",
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

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
          <CardDescription>
            Manage expenses, categories, budgets, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-auto min-h-[44px] flex-col gap-1 py-3 sm:min-h-0"
            >
              <Link href="/dashboard/expenses">
                <Receipt className="h-5 w-5" aria-hidden />
                Expenses
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-auto min-h-[44px] flex-col gap-1 py-3 sm:min-h-0"
            >
              <Link href="/dashboard/categories">
                <FolderTree className="h-5 w-5" aria-hidden />
                Categories
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-auto min-h-[44px] flex-col gap-1 py-3 sm:min-h-0"
            >
              <Link href="/dashboard/budgets">
                <PiggyBank className="h-5 w-5" aria-hidden />
                Budgets
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-auto min-h-[44px] flex-col gap-1 py-3 sm:min-h-0"
            >
              <Link href="/dashboard/recurring">
                <RefreshCw className="h-5 w-5" aria-hidden />
                Recurring
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
