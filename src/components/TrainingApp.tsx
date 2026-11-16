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
import { loadWorkout } from "@/lib/storage";
import { formatSpeed, formatTime, KIND_STYLES } from "@/lib/workout";

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

  const notificationsOn = settings.notifications && permission === "granted";
  const vibrationAvailable = canVibrate();
  const wakeLockAvailable = "wakeLock" in navigator;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const timer = useWorkoutTimer(workout, {
    onStageChange: (t) => {
      if (settings.sound) stageBeep();
      if (settings.vibration) vibrate([400, 150, 400]);
      if (notificationsOn) {
        const prefix = t.cycle ? `Ciclo ${t.cycle}/${workout.cycles} · ` : "";
        void notify(`${prefix}${t.stage.name}`, `${formatSpeed(t.stage)} durante ${formatTime(t.stage.durationSec)}`);
      }
    },
    onCountdown: () => {
      if (settings.sound) countdownBeep();
      if (settings.vibration) vibrate(120);
    },
    onFinish: (total) => {
      if (settings.sound) finishBeep();
      if (settings.vibration) vibrate([300, 100, 300, 100, 600]);
      if (notificationsOn) void notify("¡Entrenamiento terminado! 🎉", `Tiempo total ${formatTime(total)}`);
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

  const toggleNotifications = async () => {
    if (notificationsOn) {
      update({ notifications: false });
      return;
    }
    const ok = await askPermission();
    update({ notifications: ok });
  };

  const handleStart = () => {
    unlockAudio();
    // Pedimos permiso aprovechando el gesto del usuario (por default está activado).
    if (settings.notifications && permission === "default") void askPermission();
    timer.start(readSpeedParam());
  };

  const handleStop = () => {
    if (window.confirm("¿Terminar el entrenamiento?")) timer.stop();
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
          <Controls status={timer.status} onStart={handleStart} onPause={timer.pause} onResume={timer.resume} onStop={handleStop} />
          {timer.status === "paused" && <p className="animate-pulse text-amber-300">En pausa</p>}
          {timer.speed !== 1 && active && <p className="text-xs text-fuchsia-300">Modo prueba ×{timer.speed}</p>}
        </div>
      </main>

      {toast && (
        <div className="fixed inset-x-4 top-20 z-30 rounded-xl bg-zinc-800 p-3 text-center text-sm shadow-xl" role="status">
          {toast}
        </div>
      )}
      {!active && <InstallBanner />}
    </div>
  );
}
