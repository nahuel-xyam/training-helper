export type Theme = "dark" | "light";

export const THEME_KEY = "th:theme";
export const THEME_COLORS: Record<Theme, string> = { dark: "#09090b", light: "#f4f4f5" };

/** Script inline que corre antes del primer pintado para evitar el flash de tema. */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==="light"?"${THEME_COLORS.light}":"${THEME_COLORS.dark}"}}catch(e){}`;

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

let transitionTimer: number | undefined;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Mientras dura el cambio, todos los colores transicionan juntos (ver .theme-transition en globals.css).
  root.classList.add("theme-transition");
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => root.classList.remove("theme-transition"), 400);
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignorar */
  }
}
