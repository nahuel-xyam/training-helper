"use client";

import { useEffect, useRef, useState } from "react";
import { MdBubbleChart, MdPictureInPictureAlt, MdStayCurrentPortrait } from "react-icons/md";
import { Controls } from "./Controls";
import { InstallBanner } from "./InstallBanner";
import { Overview } from "./Overview";
import { StageCard } from "./StageCard";
import { TopBar } from "./TopBar";
import { usePictureInPicture, type PipSnapshot } from "@/hooks/usePictureInPicture";
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
import { isNative, native, type NativeAction, type NativeInfo, type NativeStage } from "@/lib/native";
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
  // Dentro del APK de Android: notificaciones, alarmas y burbuja las maneja el lado nativo.
  const [isApp] = useState(isNative);
  const [nativeInfo, setNativeInfo] = useState<NativeInfo | null>(null);
  // Hay notificaciones push (OneSignal) programadas: entonces no mostramos las locales para no duplicar.
  const [pushActive, setPushActive] = useState(hasScheduledPush);

  const notificationsOn = settings.notifications && permission === "granted";
  const vibrationAvailable = canVibrate();
  const wakeLockAvailable = "wakeLock" in navigator;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  // Ventana flotante (Picture-in-Picture). Mientras está abierta no suenan los beeps:
  // en Android hacen que YouTube (u otra app de video) se pause.
  const pipSnapshot = useRef<PipSnapshot | null>(null);
  const pip = usePictureInPicture(pipSnapshot);
  const soundOn = settings.sound && !pip.active;

  const stageTitle = (t: TimelineStage) => `${t.cycle ? `Ciclo ${t.cycle}/${workout.cycles} · ` : ""}${t.stage.name}`;
  const stageBody = (t: TimelineStage) => `${formatSpeed(t.stage)} durante ${formatTime(t.stage.durationSec)}`;
  const localNotifications = notificationsOn && !pushActive && !isApp;

  const timer = useWorkoutTimer(workout, {
    onStageChange: (t) => {
      if (soundOn) stageBeep();
      if (settings.vibration) vibrate([400, 150, 400]);
      if (localNotifications) void notify(stageTitle(t), stageBody(t));
    },
    onCountdown: () => {
      if (soundOn) countdownBeep();
      if (settings.vibration) vibrate(120);
    },
    onFinish: (total) => {
      if (soundOn) finishBeep();
      if (settings.vibration) vibrate([300, 100, 300, 100, 600]);
      if (localNotifications) void notify("¡Entrenamiento terminado! 🎉", `Tiempo total ${formatTime(total)}`);
      clearScheduledPush();
      setPushActive(false);
    },
  });

  const active = timer.status === "running" || timer.status === "paused";
  useWakeLock(settings.wakeLock && timer.status === "running");

  // Ventana flotante (Picture-in-Picture): le pasamos un snapshot con su marca de tiempo
  // y ella calcula la etapa y la cuenta regresiva por su cuenta.
  useEffect(() => {
    pipSnapshot.current = {
      timeline: timer.timeline,
      cycles: workout.cycles,
      elapsed: timer.elapsed,
      total: timer.total,
      running: timer.status === "running",
      paused: timer.status === "paused",
      finished: timer.status === "finished",
      speed: timer.speed,
      at: Date.now(),
    };
  });

  const togglePip = async () => {
    if (pip.active) {
      await pip.close();
      return;
    }
    if (!(await pip.open())) showToast("No se pudo abrir la ventana flotante en este navegador.");
  };

  const askPermission = async (): Promise<boolean> => {
    if (isApp) {
      const r = await native.notificationPermission(true);
      setPermission(r);
      if (r === "denied") showToast("Notificaciones bloqueadas: habilitalas en Ajustes → Apps → Training Helper.");
      return r === "granted";
    }
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

  /** Manda al APK el cronograma de las etapas que faltan (horas de fin reales). */
  const syncNative = async (anchorMs: number, fromElapsed: number, speed: number, paused = false, alerts = notificationsOn) => {
    if (!isApp) return;
    const stages: NativeStage[] = timer.timeline
      .filter((t) => t.endSec > fromElapsed)
      .map((t) => ({
        name: t.stage.name,
        chip: t.cycle ? `Ciclo ${t.cycle}/${workout.cycles}` : KIND_STYLES[t.stage.kind].label,
        speed: formatSpeed(t.stage),
        color: KIND_STYLES[t.stage.kind].color,
        endAt: Math.round(anchorMs + ((t.endSec - fromElapsed) / speed) * 1000),
        durationMs: Math.round((t.stage.durationSec / speed) * 1000),
      }));
    await native.start(workout.name, stages, alerts);
    if (paused) await native.pause();
  };

  const cancelPush = () => {
    setPushActive(false);
    void cancelScheduledPush();
  };

  const toggleNotifications = async () => {
    if (notificationsOn) {
      update({ notifications: false });
      cancelPush();
      if (active) await syncNative(Date.now(), timer.elapsed, timer.speed, timer.status === "paused", false);
      return;
    }
    const ok = await askPermission();
    update({ notifications: ok });
    if (ok && timer.status === "running") await schedulePushFrom(Date.now(), timer.elapsed, timer.speed);
    if (active) await syncNative(Date.now(), timer.elapsed, timer.speed, timer.status === "paused", ok);
  };

  const handleStart = async () => {
    unlockAudio();
    const speed = readSpeedParam();
    const startedAt = Date.now();
    timer.start(speed);
    // Pedimos permiso aprovechando el gesto del usuario (por default está activado).
    let granted = permission === "granted";
    if (settings.notifications && permission === "default") granted = await askPermission();
    if (isApp) await syncNative(startedAt, 0, speed, false, settings.notifications && granted);
    else if (settings.notifications && granted) await schedulePushFrom(startedAt, 0, speed);
  };

  const handlePause = () => {
    timer.pause();
    cancelPush();
    if (isApp) void native.pause();
  };

  const handleResume = () => {
    const resumedAt = Date.now();
    const elapsed = timer.elapsed;
    timer.resume();
    if (isApp) void syncNative(resumedAt, elapsed, timer.speed);
    else if (notificationsOn) void schedulePushFrom(resumedAt, elapsed, timer.speed);
  };

  const handleStop = () => {
    if (!window.confirm("¿Terminar el entrenamiento?")) return;
    timer.stop();
    cancelPush();
    void pip.close();
    if (isApp) void native.stop();
  };

  // ---- APK: botones de la notificación, estado al abrir y permisos ----
  // Los handlers se leen desde una ref para usar siempre el estado más reciente del timer.
  const nativeHandlers = useRef<Record<NativeAction, () => void>>({ pause() {}, resume() {}, stop() {} });
  useEffect(() => {
    nativeHandlers.current = {
      // El lado nativo ya aplicó la acción; acá sincronizamos el cronómetro de la web.
      pause: () => timer.pause(),
      resume: () => {
        const at = Date.now();
        const elapsed = timer.elapsed;
        timer.resume();
        void syncNative(at, elapsed, timer.speed);
      },
      stop: () => {
        timer.stop();
        void pip.close();
      },
    };
  });

  const resyncRef = useRef<() => void>(() => {});
  useEffect(() => {
    resyncRef.current = () => {
      if (timer.status === "running" || timer.status === "paused") {
        void syncNative(Date.now(), timer.elapsed, timer.speed, timer.status === "paused");
      }
    };
  });

  useEffect(() => {
    if (!isApp) return;
    const refreshInfo = () => void native.getInfo().then(setNativeInfo);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshInfo();
    };
    refreshInfo();
    void native.notificationPermission().then(setPermission);
    // Acción tocada en la notificación mientras la web no estaba; si no hay, re-sincronizamos.
    void native.takePendingAction().then((a) => {
      if (a) nativeHandlers.current[a]();
      else resyncRef.current();
    });
    const off = native.onAction((a) => nativeHandlers.current[a]());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isApp]);

  const toggleBubble = async () => {
    if (!nativeInfo) return;
    if (!nativeInfo.canDrawOverlays) {
      showToast("Activá \"Mostrar sobre otras apps\" para Training Helper y volvé a la app.");
      await native.openOverlaySettings();
      return;
    }
    await native.setBubble(!nativeInfo.bubbleEnabled);
    setNativeInfo(await native.getInfo());
  };

  const bg = timer.current ? KIND_STYLES[timer.current.stage.kind].bg : "transparent";

  return (
    <div className="flex min-h-dvh flex-col transition-colors duration-700" style={{ background: `linear-gradient(to bottom, ${bg}, transparent 60%)` }}>
      <TopBar
        notificationsOn={notificationsOn}
        soundOn={soundOn}
        soundLocked={pip.active}
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
        {/* Resumen + card juntos, centrados en el espacio libre */}
        <div className="flex flex-1 flex-col justify-center gap-12 pt-4 short:gap-5 short:pt-0">
        <Overview
          name={workout.name}
          timeline={timer.timeline}
          index={timer.status === "finished" ? timer.timeline.length : timer.index}
          elapsed={timer.elapsed}
          total={timer.total}
        />

        <StageCard
          workout={workout}
          stage={timer.current ?? (timer.status === "idle" ? (timer.timeline[0] ?? null) : null)}
          next={timer.current ? timer.next : (timer.timeline[1] ?? null)}
          remaining={timer.current ? timer.stageRemaining : (timer.timeline[0]?.stage.durationSec ?? 0)}
          started={!!timer.current}
          finished={timer.status === "finished"}
          total={timer.total}
        />
        </div>

        <div className="flex flex-col items-center gap-3">
          <Controls status={timer.status} onStart={() => void handleStart()} onPause={handlePause} onResume={handleResume} onStop={handleStop} />
          <div className="flex min-h-8 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            {active && isApp && nativeInfo && (
              <button
                type="button"
                onClick={() => void toggleBubble()}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-[7px] text-base font-medium transition-colors active:scale-95 ${
                  nativeInfo.canDrawOverlays && nativeInfo.bubbleEnabled ? "border-fg/30 bg-fg/15 text-fg" : "border-fg/15 bg-fg/[0.05] text-fg/75"
                }`}
              >
                <MdBubbleChart size={21} />
                {!nativeInfo.canDrawOverlays ? "Activar burbuja flotante" : nativeInfo.bubbleEnabled ? "Burbuja: sí" : "Burbuja: no"}
              </button>
            )}
            {active && isApp && nativeInfo?.supportsPromotion && !nativeInfo.canPromote && (
              <button
                type="button"
                onClick={() => void native.openPromotionSettings()}
                className="flex items-center gap-2 rounded-full border border-fg/15 bg-fg/[0.05] px-3.5 py-[7px] text-base font-medium text-fg/75 active:scale-95"
              >
                <MdStayCurrentPortrait size={21} />
                Timer en la barra de estado
              </button>
            )}
            {active && !isApp && pip.supported && (
              <button
                type="button"
                onClick={() => void togglePip()}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-[7px] text-base font-medium transition-colors active:scale-95 ${
                  pip.active ? "border-fg/30 bg-fg/15 text-fg" : "border-fg/15 bg-fg/[0.05] text-fg/75"
                }`}
              >
                <MdPictureInPictureAlt size={21} />
                {pip.active ? "Cerrar ventana flotante" : "Ventana flotante"}
              </button>
            )}
            {timer.status === "paused" && <p className="animate-pulse font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-300">En pausa</p>}
            {timer.speed !== 1 && active && <p className="text-xs text-fuchsia-600 dark:text-fuchsia-300">Modo prueba ×{timer.speed}</p>}
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
