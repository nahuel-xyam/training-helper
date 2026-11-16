"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadRun, saveRun, type RunState } from "@/lib/storage";
import { expandWorkout, stageIndexAt, type TimelineStage, type Workout } from "@/lib/workout";

export type TimerStatus = "idle" | "running" | "paused" | "finished";

type Callbacks = {
  onStageChange?: (stage: TimelineStage, timeline: TimelineStage[]) => void;
  onCountdown?: (secondsLeft: number) => void;
  onFinish?: (totalSec: number) => void;
};

function elapsedOf(run: RunState, now: number): number {
  const end = run.status === "paused" && run.pausedAt ? run.pausedAt : now;
  return Math.max(0, ((end - run.startedAt) / 1000) * run.speed);
}

/**
 * El tiempo se calcula siempre desde timestamps (Date.now), así que si el navegador
 * congela la pestaña, al volver el cronómetro y la etapa son correctos.
 */
export function useWorkoutTimer(workout: Workout, callbacks: Callbacks = {}) {
  const timeline = useMemo(() => expandWorkout(workout), [workout]);
  const total = timeline.length ? timeline[timeline.length - 1].endSec : 0;

  const [run, setRun] = useState<RunState | null>(() => {
    const r = loadRun();
    // Si quedó una sesión vieja que ya terminó (p.ej. cerraste la app), la descartamos.
    if (r && elapsedOf(r, Date.now()) >= total) {
      saveRun(null);
      return null;
    }
    return r;
  });
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  const cbRef = useRef(callbacks);
  useEffect(() => {
    cbRef.current = callbacks;
  });

  // null = todavía no observamos ninguna etapa (evita disparar avisos al restaurar tras refresh)
  const lastIndexRef = useRef<number | null>(null);
  const lastCountdownRef = useRef<string>("");

  const persist = useCallback((r: RunState | null) => {
    saveRun(r);
    setRun(r);
  }, []);

  // Tick mientras corre (también detecta el final).
  // requestAnimationFrame para que las centésimas se vean fluidas con la pestaña visible;
  // setInterval como respaldo cuando la pestaña está en segundo plano (rAF se pausa).
  useEffect(() => {
    if (!run || run.status !== "running") return;
    let done = false;
    let raf = 0;
    const tick = () => {
      if (done) return;
      const t = Date.now();
      if (elapsedOf(run, t) >= total) {
        done = true;
        lastIndexRef.current = null;
        persist(null);
        setFinished(true);
        cbRef.current.onFinish?.(total);
        return;
      }
      setNow(t);
    };
    const frame = () => {
      tick();
      if (!done) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [run, total, persist]);

  const elapsed = run ? elapsedOf(run, now) : finished ? total : 0;
  const index = run ? stageIndexAt(timeline, elapsed) : -1;

  // Detección de cambios de etapa y cuenta regresiva (solo dispara avisos)
  useEffect(() => {
    if (!run || run.status !== "running" || index >= timeline.length) return;
    const prev = lastIndexRef.current;
    if (prev !== index) {
      lastIndexRef.current = index;
      // Al iniciar (prev === -1) o al cambiar de etapa avisamos; al restaurar (prev === null) no.
      if (prev !== null) cbRef.current.onStageChange?.(timeline[index], timeline);
    }
    const remaining = timeline[index].endSec - elapsed;
    const secLeft = Math.ceil(remaining);
    if (secLeft >= 1 && secLeft <= 3 && run.speed <= 2) {
      const key = `${index}:${secLeft}`;
      if (lastCountdownRef.current !== key) {
        lastCountdownRef.current = key;
        cbRef.current.onCountdown?.(secLeft);
      }
    }
  }, [run, index, elapsed, timeline]);

  const start = useCallback(
    (speed = 1) => {
      const t = Date.now();
      setFinished(false);
      lastIndexRef.current = -1;
      lastCountdownRef.current = "";
      setNow(t);
      persist({ status: "running", startedAt: t, pausedAt: null, speed });
    },
    [persist]
  );

  const pause = useCallback(() => {
    if (run?.status !== "running") return;
    const t = Date.now();
    setNow(t);
    persist({ ...run, status: "paused", pausedAt: t });
  }, [run, persist]);

  const resume = useCallback(() => {
    if (run?.status !== "paused" || !run.pausedAt) return;
    const t = Date.now();
    if (lastIndexRef.current === null) lastIndexRef.current = index;
    setNow(t);
    persist({ ...run, status: "running", startedAt: run.startedAt + (t - run.pausedAt), pausedAt: null });
  }, [run, index, persist]);

  const stop = useCallback(() => {
    lastIndexRef.current = null;
    setFinished(false);
    persist(null);
  }, [persist]);

  const status: TimerStatus = run ? run.status : finished ? "finished" : "idle";
  const current = index >= 0 && index < timeline.length ? timeline[index] : null;
  const next = current && index + 1 < timeline.length ? timeline[index + 1] : null;

  return {
    status,
    timeline,
    total,
    elapsed,
    index,
    current,
    next,
    stageElapsed: current ? elapsed - current.startSec : 0,
    stageRemaining: current ? current.endSec - elapsed : 0,
    speed: run?.speed ?? 1,
    start,
    pause,
    resume,
    stop,
  };
}
