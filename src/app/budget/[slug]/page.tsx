"use client";

import { useParams } from "next/navigation";
import { format } from "date-fns";
import { usePublicBudget } from "@/lib/hooks/use-budgets";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatRupee } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicBudgetPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : null;
  const { data: compare, isLoading, error } = usePublicBudget(slug);

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>No budget slug provided.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-muted h-32 w-64 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !compare) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Budget not found</CardTitle>
            <CardDescription>
              This shared budget may have been removed or the link is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline">Go home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { budget, spending, limit, remaining, percentUsed, expenseCount } =
    compare;
  const periodLabel = budget.month
    ? `${format(new Date(budget.year, (budget.month ?? 1) - 1), "MMM yyyy")}`
    : `Year ${budget.year}`;
  const categoryLabel =
    budget.category && budget.category.trim() ? budget.category : "Overall";
  const pct = Math.min(percentUsed, 100);
  const barColor =
    percentUsed > 100
      ? "bg-red-500"
      : percentUsed >= 80
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="bg-muted/30 min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex justify-end">
          <Link href="/">
            <Button variant="ghost" size="sm">
              TraceX home
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{categoryLabel}</CardTitle>
            <CardDescription>
              {periodLabel} · Limit: {formatRupee(limit)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={percentUsed}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {remaining >= 0
                  ? `${formatRupee(remaining)} remaining`
                  : "Over budget"}{" "}
                · {expenseCount} expense(s)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
