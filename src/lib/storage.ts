import { DEFAULT_WORKOUT, sanitizeWorkout, type Workout } from "./workout";

const KEYS = {
  workout: "th:workout",
  settings: "th:settings",
  run: "th:run",
  installDismissed: "th:install-dismissed",
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage lleno o bloqueado */
  }
}

// ---- Entrenamiento ----
export function loadWorkout(): Workout {
  return sanitizeWorkout(read(KEYS.workout)) ?? DEFAULT_WORKOUT;
}
export function saveWorkout(w: Workout) {
  write(KEYS.workout, w);
}
export function resetWorkout() {
  write(KEYS.workout, null);
}
export function isCustomWorkout(): boolean {
  return sanitizeWorkout(read(KEYS.workout)) !== null;
}

// ---- Ajustes ----
export type Settings = { notifications: boolean; sound: boolean; vibration: boolean; wakeLock: boolean };
export const DEFAULT_SETTINGS: Settings = { notifications: true, sound: true, vibration: true, wakeLock: true };

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<Settings>>(KEYS.settings) ?? {}) };
}
export function saveSettings(s: Settings) {
  write(KEYS.settings, s);
}

// ---- Estado de la sesión en curso (sobrevive a un refresh) ----
export type RunState = {
  status: "running" | "paused";
  /** epoch ms en que arrancó (ajustado por pausas) */
  startedAt: number;
  /** epoch ms en que se pausó (solo si status === "paused") */
  pausedAt: number | null;
  /** factor de velocidad para pruebas (?speed=30) */
  speed: number;
};
export function loadRun(): RunState | null {
  return read<RunState>(KEYS.run);
}
export function saveRun(r: RunState | null) {
  write(KEYS.run, r);
}

// ---- Banner de instalación ----
export function isInstallDismissed(): boolean {
  return read<boolean>(KEYS.installDismissed) === true;
}
export function dismissInstall() {
  write(KEYS.installDismissed, true);
}
