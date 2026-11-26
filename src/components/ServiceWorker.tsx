"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/native";
import { initPush, pushEnabled } from "@/lib/push";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    // Dentro del APK no usamos service worker (podría interferir con el puente nativo).
    if (isNative()) {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }
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
