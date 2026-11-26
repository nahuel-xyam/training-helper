// Avisos: beep (Web Audio), vibración y notificaciones web.

let audioCtx: AudioContext | null = null;

/**
 * Con la app en segundo plano (p.ej. mirando YouTube con la ventana flotante) no hacemos sonar nada:
 * si la página reproduce audio, Android le da el "foco de audio" a Chrome y YouTube se pausa.
 * Ahí avisan la notificación (Android solo baja el volumen un momento) y la vibración.
 */
function inBackground(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

if (typeof document !== "undefined") {
  // Al irse a segundo plano soltamos el audio para no quedarnos con el foco.
  document.addEventListener("visibilitychange", () => {
    if (!audioCtx) return;
    if (inBackground()) void audioCtx.suspend().catch(() => {});
    else void audioCtx.resume().catch(() => {});
  });
}

/** Debe llamarse dentro de un gesto del usuario (tap en Empezar) para desbloquear el audio en mobile. */
export function unlockAudio() {
  if (inBackground()) return;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

function tone(freq: number, startAt: number, duration: number, volume = 0.35) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** Beep corto para la cuenta regresiva 3-2-1. */
export function countdownBeep() {
  if (inBackground()) return;
  unlockAudio();
  if (!audioCtx) return;
  tone(660, audioCtx.currentTime, 0.15);
}

/** Beep largo doble para el cambio de etapa. */
export function stageBeep() {
  if (inBackground()) return;
  unlockAudio();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(880, t, 0.25);
  tone(1175, t + 0.28, 0.45);
}

/** Melodía de fin. */
export function finishBeep() {
  if (inBackground()) return;
  unlockAudio();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.18, 0.3));
}

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function vibrate(pattern: number | number[]) {
  if (canVibrate()) navigator.vibrate(pattern);
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export async function notify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options = {
    body,
    tag: "th-local",
    renotify: true,
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/icon-192.png`,
    badge: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/badge-96.png`,
    vibrate: [300, 100, 300],
  } as NotificationOptions;
  try {
    // En Android/iOS solo funciona vía service worker.
    const reg =
      "serviceWorker" in navigator && (await navigator.serviceWorker.getRegistration())
        ? await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<undefined>((r) => setTimeout(() => r(undefined), 2000)),
          ])
        : undefined;
    if (reg?.active) {
      await reg.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    /* ignorar */
  }
}
