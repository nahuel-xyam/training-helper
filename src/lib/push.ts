// Web Push vía OneSignal: programa una notificación por cada cambio de etapa para que lleguen
// aunque la app esté en segundo plano (p.ej. mirando YouTube) o cerrada.
//
// Ojo: la REST API key viaja en el bundle público. Usar una app de OneSignal exclusiva para esto
// (el único suscripto es el dueño), así lo peor que puede pasar es que alguien te mande spam.

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
const REST_KEY = process.env.NEXT_PUBLIC_ONESIGNAL_REST_KEY ?? "";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const API = "https://api.onesignal.com";
const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
const IDS_KEY = "th:push-ids";

type PushSubscriptionChange = { current: { id?: string | null } };
type OneSignalSDK = {
  init: (options: Record<string, unknown>) => Promise<void>;
  Notifications: {
    addEventListener: (event: "foregroundWillDisplay", cb: (e: { preventDefault: () => void }) => void) => void;
  };
  User: {
    PushSubscription: {
      id?: string | null;
      optedIn?: boolean;
      optIn: () => Promise<void>;
      addEventListener: (event: "change", cb: (e: PushSubscriptionChange) => void) => void;
      removeEventListener: (event: "change", cb: (e: PushSubscriptionChange) => void) => void;
    };
  };
};

export type PushItem = { at: number; title: string; body: string };

/** Solo en producción sobre HTTPS (OneSignal valida el dominio configurado en el dashboard). */
export function pushEnabled(): boolean {
  return (
    !!APP_ID &&
    !!REST_KEY &&
    process.env.NODE_ENV === "production" &&
    typeof window !== "undefined" &&
    window.location.protocol === "https:"
  );
}

let sdkPromise: Promise<OneSignalSDK | null> | null = null;

/** Carga e inicializa el SDK (registra el service worker /training-helper/sw.js). */
export function initPush(): Promise<OneSignalSDK | null> {
  if (!pushEnabled()) return Promise.resolve(null);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    const w = window as unknown as { OneSignalDeferred?: Array<(os: OneSignalSDK) => void> };
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: APP_ID,
          // relativo a la raíz del sitio, sin "/" inicial
          serviceWorkerPath: `${BASE.replace(/^\//, "")}${BASE ? "/" : ""}sw.js`,
          serviceWorkerParam: { scope: `${BASE}/` },
          notifyButton: { enable: false },
        });
        // Con la app a la vista ya avisamos con beep/vibración: no mostrar el push encima.
        OneSignal.Notifications.addEventListener("foregroundWillDisplay", (e) => {
          if (document.visibilityState === "visible") e.preventDefault();
        });
        resolve(OneSignal);
      } catch {
        resolve(null);
      }
    });
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.defer = true;
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** Devuelve el id de suscripción push (null si no hay permiso o no se pudo suscribir). */
async function ensureSubscription(): Promise<string | null> {
  const OneSignal = await initPush();
  if (!OneSignal || Notification.permission !== "granted") return null;
  const sub = OneSignal.User.PushSubscription;
  if (!sub.optedIn) {
    try {
      await sub.optIn();
    } catch {
      /* ignorar */
    }
  }
  if (sub.id) return sub.id;
  return new Promise((resolve) => {
    const onChange = (e: PushSubscriptionChange) => {
      if (e.current.id) {
        sub.removeEventListener("change", onChange);
        resolve(e.current.id);
      }
    };
    sub.addEventListener("change", onChange);
    window.setTimeout(() => {
      sub.removeEventListener("change", onChange);
      resolve(sub.id ?? null);
    }, 8000);
  });
}

function readIds(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(IDS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeIds(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(IDS_KEY, JSON.stringify(ids));
    else localStorage.removeItem(IDS_KEY);
  } catch {
    /* ignorar */
  }
}

/** Hay notificaciones push programadas para la sesión actual. */
export function hasScheduledPush(): boolean {
  return readIds().length > 0;
}

/** Olvida los ids (cuando el entrenamiento terminó y ya se enviaron todas). */
export function clearScheduledPush() {
  writeIds([]);
}

const headers = { Authorization: `Key ${REST_KEY}`, "Content-Type": "application/json" };

async function cancelIds(ids: string[]) {
  await Promise.all(
    ids.map((id) =>
      fetch(`${API}/notifications/${id}?app_id=${APP_ID}`, { method: "DELETE", headers, keepalive: true }).catch(() => null)
    )
  );
}

// Cada programación/cancelación incrementa la generación; si cambia mientras se crean
// las notificaciones (p.ej. tocaste Pausa enseguida), las recién creadas se cancelan.
let generation = 0;

/** Cancela las notificaciones programadas pendientes. */
export async function cancelScheduledPush() {
  generation++;
  const ids = readIds();
  writeIds([]);
  if (ids.length && pushEnabled()) await cancelIds(ids);
}

/** Reemplaza lo programado por `items`. Devuelve true si quedó al menos una programada. */
export async function schedulePush(items: PushItem[]): Promise<boolean> {
  await cancelScheduledPush();
  const myGen = generation;
  const now = Date.now();
  const future = items.filter((it) => it.at > now + 1000);
  if (!future.length) return false;

  const subId = await ensureSubscription();
  if (!subId || myGen !== generation) return false;

  const origin = window.location.origin;
  const created = await Promise.all(
    future.map(async (it) => {
      try {
        const res = await fetch(`${API}/notifications?c=push`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            app_id: APP_ID,
            include_subscription_ids: [subId],
            target_channel: "push",
            isAnyWeb: true,
            headings: { en: it.title },
            contents: { en: it.body },
            send_after: new Date(it.at).toISOString(),
            ttl: 300, // si no se pudo entregar en 5 min, ya no sirve
            url: `${origin}${BASE}/`,
            chrome_web_icon: `${origin}${BASE}/icons/icon-192.png`,
            chrome_web_badge: `${origin}${BASE}/icons/badge-96.png`,
            web_push_topic: "training-stage",
          }),
        });
        const data = (await res.json()) as { id?: string };
        return data.id || null;
      } catch {
        return null;
      }
    })
  );
  const ids = created.filter((x): x is string => !!x);

  if (myGen !== generation) {
    await cancelIds(ids);
    return false;
  }
  writeIds(ids);
  return ids.length > 0;
}
