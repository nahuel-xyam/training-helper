"use client";

import { Suspense, use, type ReactNode } from "react";
import { browser } from "react-dom";

function Gate({ children }: { children: ReactNode }) {
  use(browser("Usa localStorage y APIs del navegador."));
  return children;
}

/** Renderiza `children` solo en el navegador (todo depende de localStorage). */
export function BrowserOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
