"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { Wallet } from "lucide-react";

const WALLET_ICON = "https://cdn.lordicon.com/yycecovd.json";
const TRACE = "Trace";
const TYPING_MS = 120;
const CURSOR_BLINK_MS = 530;
const X_DELAY_MS = 200;
const SPLASH_MIN_MS = 1500; // 3 seconds

export function SplashScreen({
  onComplete,
  className,
}: {
  onComplete: () => void;
  className?: string;
}) {
  const { resolvedDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [typedLength, setTypedLength] = useState(0);
  const [showX, setShowX] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [lordIconReady, setLordIconReady] = useState(false);
  const completedRef = useRef(false);
  const lordIconColors =
    mounted && resolvedDark ? "primary:#fafafa" : "primary:#18181b";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Detect when lord-icon custom element is available (script loads afterInteractive)
  useEffect(() => {
    if (
      typeof customElements !== "undefined" &&
      customElements.get("lord-icon")
    ) {
      const t = setTimeout(() => setLordIconReady(true), 0);
      return () => clearTimeout(t);
    }
    const check = setInterval(() => {
      if (customElements.get("lord-icon")) {
        setLordIconReady(true);
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, []);

  // Type "Trace" letter by letter
  useEffect(() => {
    if (typedLength >= TRACE.length) {
      const t = setTimeout(() => setShowX(true), X_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedLength((n) => n + 1), TYPING_MS);
    return () => clearTimeout(t);
  }, [typedLength]);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setCursorOn((c) => !c), CURSOR_BLINK_MS);
    return () => clearInterval(id);
  }, []);

  // Show splash for exactly SPLASH_MIN_MS, then fade out and call onComplete (single effect, no reset)
  useEffect(() => {
    if (completedRef.current) return;
    const t = setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      setFadeOut(true);
      const t2 = setTimeout(() => onComplete(), 400);
      return () => clearTimeout(t2);
    }, SPLASH_MIN_MS + 400);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center gap-10 px-4 transition-opacity duration-300",
        "bg-background",
        fadeOut && "pointer-events-none opacity-0",
        className
      )}
      style={{ minHeight: "100dvh" }}
      aria-hidden="true"
    >
      {/* Wallet icon — large, centered; fallback to Lucide if lord-icon not loaded */}
      <div
        className="text-foreground flex shrink-0 items-center justify-center [&_lord-icon]:block"
        style={{ width: 200, height: 200 }}
      >
        {lordIconReady ? (
          React.createElement("lord-icon", {
            src: WALLET_ICON,
            trigger: "loop",
            delay: "200",
            colors: lordIconColors,
            style: { width: 200, height: 200 },
          } as React.HTMLAttributes<HTMLElement> & {
            src: string;
            trigger: string;
            delay?: string;
            colors?: string;
          })
        ) : (
          <Wallet className="h-32 w-32 opacity-90" aria-hidden />
        )}
      </div>

      {/* Trace + X title with typing and styled X */}
      <div className="flex min-h-[3.5rem] flex-wrap items-baseline justify-center gap-0 font-bold tracking-tight">
        <span className="text-foreground text-5xl sm:text-6xl md:text-7xl">
          {TRACE.slice(0, typedLength)}
        </span>
        <span
          className={cn(
            "inline-block transition-all duration-300",
            cursorOn && typedLength < TRACE.length
              ? "opacity-100"
              : "opacity-0",
            typedLength < TRACE.length &&
              "bg-foreground ml-0.5 h-[0.9em] w-0.5 align-middle"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "x-letter text-5xl font-extrabold sm:text-6xl md:text-7xl",
            showX
              ? "animate-splash-x opacity-100"
              : "translate-x-2 scale-75 opacity-0"
          )}
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--primary) 45%, #a855f7 70%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          X
        </span>
      </div>
    </div>
  );
}
