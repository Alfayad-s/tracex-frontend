"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { exportExpensesCsv } from "@/lib/api/client";
import { CategorySelect } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export default function ExportPage() {
  const thisMonth = {
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  };
  const lastMonth = {
    from: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
    to: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
  };

  const [from, setFrom] = useState(thisMonth.from);
  const [to, setTo] = useState(thisMonth.to);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      await exportExpensesCsv(from, to, category || undefined);
      toast.success("Export started. File should download shortly.");
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e?.status !== 400) {
        toast.error(e?.message ?? "Export failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Export expenses (CSV)</CardTitle>
          <CardDescription>
            Choose a date range and optionally filter by category. The file will
            include date, amount, category, and description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="export-from">From</Label>
              <Input
                id="export-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-to">To</Label>
              <Input
                id="export-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Category (optional)</Label>
              <CategorySelect
                value={category}
                onValueChange={setCategory}
                placeholder="All categories"
                label=""
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(thisMonth.from);
                setTo(thisMonth.to);
              }}
            >
              This month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(lastMonth.from);
                setTo(lastMonth.to);
              }}
            >
              Last month
            </Button>
          </div>
          <Button onClick={handleExport} disabled={loading}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            {loading ? "Exporting…" : "Download CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
