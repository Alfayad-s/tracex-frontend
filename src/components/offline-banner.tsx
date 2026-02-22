"use client";

import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    function setOnline() {
      setIsOnline(true);
    }
    function setOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-20 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      You are offline. Some features may be unavailable.
    </div>
  );
}
