// Puente con el APK de Android (Capacitor). En el navegador todo esto queda inactivo.
// El lado nativo está en android/app/src/main/java/dev/xyam/traininghelper/timer/.

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type NativeStage = {
  name: string;
  /** "Ciclo 2/4", "Calentamiento", ... */
  chip: string;
  speed: string;
  color: string;
  /** hora de fin de la etapa (epoch ms) */
  endAt: number;
  durationMs: number;
};

export type NativeInfo = {
  sdk: number;
  canDrawOverlays: boolean;
  bubbleEnabled: boolean;
  /** Android 16+: soporta Live Updates (chip en la barra de estado) */
  supportsPromotion: boolean;
  /** el usuario permite el Live Update para esta app */
  canPromote: boolean;
};

export type NativeAction = "pause" | "resume" | "stop";

type PermissionResult = { notifications: "granted" | "denied" | "prompt" | "prompt-with-rationale" };

interface TrainingPlugin {
  start(options: { workoutName: string; alerts: boolean; stages: NativeStage[] }): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setBubble(options: { enabled: boolean }): Promise<void>;
  getInfo(): Promise<NativeInfo>;
  openOverlaySettings(): Promise<void>;
  openPromotionSettings(): Promise<void>;
  takePendingAction(): Promise<{ action: NativeAction | null }>;
  checkPermissions(): Promise<PermissionResult>;
  requestPermissions(): Promise<PermissionResult>;
  addListener(event: "action", cb: (data: { action: NativeAction }) => void): Promise<PluginListenerHandle>;
}

const Training = registerPlugin<TrainingPlugin>("Training");

/** Estamos dentro del APK. */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Training");
  } catch {
    return false;
  }
}

// Todas las llamadas son "a prueba de fallos": si el APK instalado es viejo y no tiene
// algún método, la web sigue funcionando.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const native = {
  start: (workoutName: string, stages: NativeStage[], alerts: boolean) =>
    safe(() => Training.start({ workoutName, stages, alerts }), undefined),
  pause: () => safe(() => Training.pause(), undefined),
  stop: () => safe(() => Training.stop(), undefined),
  setBubble: (enabled: boolean) => safe(() => Training.setBubble({ enabled }), undefined),
  getInfo: () => safe<NativeInfo | null>(() => Training.getInfo(), null),
  openOverlaySettings: () => safe(() => Training.openOverlaySettings(), undefined),
  openPromotionSettings: () => safe(() => Training.openPromotionSettings(), undefined),
  takePendingAction: () => safe(async () => (await Training.takePendingAction()).action, null),

  /** Permiso de notificaciones de Android, en el mismo formato que Notification.permission. */
  async notificationPermission(request = false): Promise<NotificationPermission> {
    const r = await safe<PermissionResult | null>(() => (request ? Training.requestPermissions() : Training.checkPermissions()), null);
    if (!r) return "default";
    return r.notifications === "granted" ? "granted" : r.notifications === "denied" ? "denied" : "default";
  },

  onAction(cb: (action: NativeAction) => void): () => void {
    let handle: PluginListenerHandle | null = null;
    let removed = false;
    void safe(
      () =>
        Training.addListener("action", (d) => cb(d.action)).then((h) => {
          if (removed) void h.remove();
          else handle = h;
        }),
      undefined
    );
    return () => {
      removed = true;
      void handle?.remove();
    };
  },
};
