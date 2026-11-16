export type StageKind = "warmup" | "fast" | "recovery" | "cooldown" | "custom";

export type Stage = {
  id: string;
  name: string;
  kind: StageKind;
  durationSec: number;
  speedMin: number;
  speedMax: number;
};

export type Workout = {
  name: string;
  warmup: Stage | null;
  cycle: Stage[];
  cycles: number;
  cooldown: Stage | null;
};

export type TimelineStage = {
  index: number;
  stage: Stage;
  /** 1-based; null para calentamiento/enfriamiento */
  cycle: number | null;
  startSec: number;
  endSec: number;
};

export const DEFAULT_WORKOUT: Workout = {
  name: "Intervalos en cinta",
  warmup: { id: "warmup", name: "Calentamiento", kind: "warmup", durationSec: 5 * 60, speedMin: 3.5, speedMax: 4 },
  cycle: [
    { id: "fast", name: "Rápido", kind: "fast", durationSec: 3 * 60, speedMin: 5.5, speedMax: 6 },
    { id: "recovery", name: "Recuperación", kind: "recovery", durationSec: 2 * 60, speedMin: 4, speedMax: 4.5 },
  ],
  cycles: 4,
  cooldown: { id: "cooldown", name: "Enfriamiento", kind: "cooldown", durationSec: 5 * 60, speedMin: 3, speedMax: 3.5 },
};

export const KIND_STYLES: Record<StageKind, { label: string; color: string; bg: string }> = {
  warmup: { label: "Calentamiento", color: "#3b82f6", bg: "rgba(59,130,246,0.18)" },
  fast: { label: "Rápido", color: "#f97316", bg: "rgba(249,115,22,0.20)" },
  recovery: { label: "Recuperación", color: "#22c55e", bg: "rgba(34,197,94,0.18)" },
  cooldown: { label: "Enfriamiento", color: "#06b6d4", bg: "rgba(6,182,212,0.18)" },
  custom: { label: "Otra", color: "#a855f7", bg: "rgba(168,85,247,0.18)" },
};

export function expandWorkout(w: Workout): TimelineStage[] {
  const out: TimelineStage[] = [];
  let t = 0;
  const push = (stage: Stage, cycle: number | null) => {
    if (stage.durationSec <= 0) return;
    out.push({ index: out.length, stage, cycle, startSec: t, endSec: t + stage.durationSec });
    t += stage.durationSec;
  };
  if (w.warmup) push(w.warmup, null);
  for (let c = 1; c <= w.cycles; c++) for (const s of w.cycle) push(s, c);
  if (w.cooldown) push(w.cooldown, null);
  return out;
}

export function totalDuration(w: Workout): number {
  const timeline = expandWorkout(w);
  return timeline.length ? timeline[timeline.length - 1].endSec : 0;
}

/** Índice de la etapa activa; timeline.length si terminó. */
export function stageIndexAt(timeline: TimelineStage[], elapsedSec: number): number {
  for (const t of timeline) if (elapsedSec < t.endSec) return t.index;
  return timeline.length;
}

export function formatTime(totalSec: number, withHours = false): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 || withHours ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatSpeed(s: Stage): string {
  const f = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
  return s.speedMin === s.speedMax ? `${f(s.speedMin)} km/h` : `${f(s.speedMin)}–${f(s.speedMax)} km/h`;
}

export function newStageId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Valida/normaliza lo que viene de localStorage. */
export function sanitizeWorkout(raw: unknown): Workout | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Partial<Workout>;
  const okStage = (s: unknown): s is Stage =>
    !!s &&
    typeof s === "object" &&
    typeof (s as Stage).name === "string" &&
    typeof (s as Stage).durationSec === "number" &&
    typeof (s as Stage).speedMin === "number" &&
    typeof (s as Stage).speedMax === "number";
  if (!Array.isArray(w.cycle) || !w.cycle.every(okStage)) return null;
  if (typeof w.cycles !== "number" || w.cycles < 0) return null;
  if (w.warmup != null && !okStage(w.warmup)) return null;
  if (w.cooldown != null && !okStage(w.cooldown)) return null;
  return {
    name: typeof w.name === "string" ? w.name : DEFAULT_WORKOUT.name,
    warmup: w.warmup ?? null,
    cycle: w.cycle,
    cycles: Math.floor(w.cycles),
    cooldown: w.cooldown ?? null,
  };
}
