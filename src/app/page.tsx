"use client";

import { useEffect, useState } from "react";
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
import { SplashScreen } from "@/components/splash-screen";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { user, isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading || !splashDone) return;
    if (user) {
      window.location.href = "/dashboard";
    }
  }, [mounted, user, isLoading, splashDone]);

  if (!mounted) {
    return (
      <div className="bg-background min-h-screen w-full" aria-hidden="true">
        <div className="flex min-h-screen items-center justify-center">
          <div className="bg-muted h-12 w-12 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  if (!splashDone) {
    return (
      <div className="bg-background min-h-screen w-full">
        <SplashScreen onComplete={() => setSplashDone(true)} />
        {/* Optional: render main content underneath so it’s ready when splash ends */}
        <div className="sr-only" aria-hidden="true">
          <HomeContent />
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <HomeContent />
    </div>
  );
}

function HomeContent() {
  return (
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
  );
}
