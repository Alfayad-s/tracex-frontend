"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";

export default function Home() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      window.location.href = "/dashboard";
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <Wallet className="text-foreground h-10 w-10" aria-hidden />
          <h1 className="text-3xl font-semibold tracking-tight">TraceX</h1>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Expense tracking</CardTitle>
            <CardDescription>
              Professional expense tracking. Sign in or sign up to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild className="flex-1">
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/signup">Sign up</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
