"use client";

import { useState } from "react";
import { BigClock } from "./BigClock";
import { Controls } from "./Controls";
import { InstallBanner } from "./InstallBanner";
import { StageHeader } from "./StageHeader";
import { Timeline } from "./Timeline";
import { TopBar } from "./TopBar";
import { useSettings } from "@/hooks/useSettings";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";
import {
  canVibrate,
  countdownBeep,
  finishBeep,
  notificationsSupported,
  notify,
  requestNotificationPermission,
  stageBeep,
  unlockAudio,
  vibrate,
} from "@/lib/alerts";
import { cancelScheduledPush, clearScheduledPush, hasScheduledPush, pushEnabled, schedulePush, type PushItem } from "@/lib/push";
import { loadWorkout } from "@/lib/storage";
import { formatSpeed, formatTime, KIND_STYLES, type TimelineStage } from "@/lib/workout";

function readSpeedParam(): number {
  const v = Number(new URLSearchParams(window.location.search).get("speed"));
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export function TrainingApp() {
  const [workout] = useState(loadWorkout);
  const { settings, update } = useSettings();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    notificationsSupported() ? Notification.permission : "unsupported"
  );
  const [toast, setToast] = useState<string | null>(null);
  // Hay notificaciones push (OneSignal) programadas: entonces no mostramos las locales para no duplicar.
  const [pushActive, setPushActive] = useState(hasScheduledPush);

  const notificationsOn = settings.notifications && permission === "granted";
  const vibrationAvailable = canVibrate();
  const wakeLockAvailable = "wakeLock" in navigator;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const stageTitle = (t: TimelineStage) => `${t.cycle ? `Ciclo ${t.cycle}/${workout.cycles} · ` : ""}${t.stage.name}`;
  const stageBody = (t: TimelineStage) => `${formatSpeed(t.stage)} durante ${formatTime(t.stage.durationSec)}`;
  const localNotifications = notificationsOn && !pushActive;

  const timer = useWorkoutTimer(workout, {
    onStageChange: (t) => {
      if (settings.sound) stageBeep();
      if (settings.vibration) vibrate([400, 150, 400]);
      if (localNotifications) void notify(stageTitle(t), stageBody(t));
    },
    onCountdown: () => {
      if (settings.sound) countdownBeep();
      if (settings.vibration) vibrate(120);
    },
    onFinish: (total) => {
      if (settings.sound) finishBeep();
      if (settings.vibration) vibrate([300, 100, 300, 100, 600]);
      if (localNotifications) void notify("¡Entrenamiento terminado! 🎉", `Tiempo total ${formatTime(total)}`);
      clearScheduledPush();
      setPushActive(false);
    },
  });

  const active = timer.status === "running" || timer.status === "paused";
  useWakeLock(settings.wakeLock && timer.status === "running");

  const askPermission = async (): Promise<boolean> => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "unsupported") showToast("Este navegador no soporta notificaciones. En iPhone instalá la app primero.");
    else if (result === "denied") showToast("Notificaciones bloqueadas: habilitalas en los ajustes del navegador.");
    return result === "granted";
  };

  /**
   * Programa en OneSignal los avisos que faltan, para que lleguen aunque la app esté en segundo plano.
   * `anchorMs` es el instante (Date.now) que corresponde a `fromElapsed` segundos de entrenamiento.
   */
  const schedulePushFrom = async (anchorMs: number, fromElapsed: number, speed: number) => {
    if (!pushEnabled()) return;
    const at = (sec: number) => anchorMs + ((sec - fromElapsed) / speed) * 1000;
    const items: PushItem[] = timer.timeline
      .filter((t) => t.startSec > fromElapsed)
      .map((t) => ({ at: at(t.startSec), title: stageTitle(t), body: stageBody(t) }));
    items.push({ at: at(timer.total), title: "¡Entrenamiento terminado! 🎉", body: `Tiempo total ${formatTime(timer.total)}` });
    setPushActive(await schedulePush(items));
  };

  const cancelPush = () => {
    setPushActive(false);
    void cancelScheduledPush();
  };

  const toggleNotifications = async () => {
    if (notificationsOn) {
      update({ notifications: false });
      cancelPush();
      return;
    }
    const ok = await askPermission();
    update({ notifications: ok });
    if (ok && timer.status === "running") await schedulePushFrom(Date.now(), timer.elapsed, timer.speed);
  };

  const handleStart = async () => {
    unlockAudio();
    const speed = readSpeedParam();
    const startedAt = Date.now();
    timer.start(speed);
    // Pedimos permiso aprovechando el gesto del usuario (por default está activado).
    let granted = permission === "granted";
    if (settings.notifications && permission === "default") granted = await askPermission();
    if (settings.notifications && granted) await schedulePushFrom(startedAt, 0, speed);
  };

  const handlePause = () => {
    timer.pause();
    cancelPush();
  };

  const handleResume = () => {
    const resumedAt = Date.now();
    const elapsed = timer.elapsed;
    timer.resume();
    if (notificationsOn) void schedulePushFrom(resumedAt, elapsed, timer.speed);
  };

  const handleStop = () => {
    if (!window.confirm("¿Terminar el entrenamiento?")) return;
    timer.stop();
    cancelPush();
  };

  const bg = timer.current ? KIND_STYLES[timer.current.stage.kind].bg : "transparent";

  return (
    <div className="flex min-h-dvh flex-col transition-colors duration-700" style={{ background: `linear-gradient(to bottom, ${bg}, transparent 60%)` }}>
      <TopBar
        notificationsOn={notificationsOn}
        soundOn={settings.sound}
        vibrationOn={settings.vibration}
        wakeLockOn={settings.wakeLock}
        canVibrate={vibrationAvailable}
        canWakeLock={wakeLockAvailable}
        editorDisabled={active}
        onToggleNotifications={() => void toggleNotifications()}
        onToggleSound={() => update({ sound: !settings.sound })}
        onToggleVibration={() => update({ vibration: !settings.vibration })}
        onToggleWakeLock={() => update({ wakeLock: !settings.wakeLock })}
      />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-between gap-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-2">
        <div className="flex flex-col gap-4">
          <StageHeader
            workout={workout}
            current={timer.current}
            next={timer.next}
            stageElapsed={timer.stageElapsed}
            stageRemaining={timer.stageRemaining}
            finished={timer.status === "finished"}
          />
          <Timeline timeline={timer.timeline} index={timer.status === "finished" ? timer.timeline.length : timer.index} total={timer.total} />
        </div>

        <BigClock elapsed={timer.elapsed} total={timer.total} />

        <div className="flex flex-col items-center gap-3">
          <Controls status={timer.status} onStart={() => void handleStart()} onPause={handlePause} onResume={handleResume} onStop={handleStop} />
          <div className="flex h-6 items-center gap-3 text-sm">
            {timer.status === "paused" && <p className="animate-pulse font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-300">En pausa</p>}
            {timer.speed !== 1 && active && <p className="text-xs text-fuchsia-300">Modo prueba ×{timer.speed}</p>}
          </div>
        </div>
      </main>

      {toast && (
        <div className="fixed inset-x-3 top-[max(env(safe-area-inset-top),0.5rem)] z-30 rounded-2xl border border-fg/10 bg-surface/95 p-3 text-center text-sm shadow-xl backdrop-blur" role="status">
          {toast}
        </div>
      )}
      {!active && <InstallBanner />}
    </div>
  );
}
