"use client";

import { useId } from "react";
import { useTheme } from "@/hooks/useTheme";
import "./DayNightToggle.css";

/** Toggle día/noche (estilo de https://codepen.io/ashleynolan/pen/wBppKz). Día = tema claro. */
export function DayNightToggle() {
  const { theme, toggle } = useTheme();
  const id = useId();
  const isDay = theme === "light";

  return (
    <div className="dn-wrap" title={isDay ? "Tema claro" : "Tema oscuro"}>
      <div className="toggle toggle--daynight">
        <input
          type="checkbox"
          id={id}
          className="toggle--checkbox"
          checked={isDay}
          onChange={toggle}
          aria-label={isDay ? "Pasar a tema oscuro" : "Pasar a tema claro"}
        />
        <label className="toggle--btn" htmlFor={id}>
          <span className="toggle--feature" />
        </label>
      </div>
    </div>
  );
}
