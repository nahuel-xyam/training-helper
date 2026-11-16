"use client";

import { useCallback, useState } from "react";
import { applyTheme, getTheme, type Theme } from "@/lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getTheme);
  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);
  return { theme, toggle };
}
