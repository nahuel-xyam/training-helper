"use client";

import { useEffect } from "react";
import { initPush, pushEnabled } from "@/lib/push";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    // Con OneSignal activo, el SDK registra el mismo sw.js (que incluye el de OneSignal).
    if (pushEnabled()) {
      void initPush();
      return;
    }
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
  }, []);
  return null;
}
