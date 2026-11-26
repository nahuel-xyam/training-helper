# Training Helper

Cronómetro de ciclos de entrenamiento (PWA, mobile-first). Marca la etapa actual y avisa en cada cambio con notificación web, beep, vibración y cuenta regresiva 3‑2‑1.

**Entrenamiento standard (30 min):**

| Etapa | Duración | Velocidad |
|---|---|---|
| Calentamiento | 5 min | 3.5–4 km/h |
| 4 × Rápido | 3 min | 5.5–6 km/h |
| 4 × Recuperación | 2 min | 4–4.5 km/h |
| Enfriamiento | 5 min | 3–3.5 km/h |

Se puede editar desde el lápiz (se guarda en el `localStorage` del navegador) y volver al standard en cualquier momento.

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # export estático en ./out (con basePath /training-helper)
```

Modo prueba: agregá `?speed=30` a la URL para que el entrenamiento corra 30× más rápido.

## Deploy

Cada push a `main` publica en GitHub Pages vía `.github/workflows/deploy.yml`.
Configuración única: **Settings → Pages → Source: GitHub Actions**.

## Notas

- Las notificaciones en iPhone solo funcionan con la app instalada (Compartir → Agregar a inicio, iOS 16.4+).
- No hay servidor de push: si el sistema congela la pestaña (pantalla bloqueada), los avisos pueden demorarse. Por eso existe el toggle "pantalla siempre encendida" (Wake Lock).

## APK de Android

El APK (Capacitor) carga la misma interfaz desde GitHub Pages y suma funciones nativas
(`android/app/src/main/java/dev/xyam/traininghelper/timer/`):

- **Notificación fija** con la cuenta regresiva de la etapa y botones Pausa/Seguir/Parar.
  En Android 16 se pide como *Live Update*: el timer aparece en la barra de estado.
- **Avisos de etapa** con alarmas exactas del sistema (sin internet, aunque la app esté cerrada).
- **Burbuja flotante** arrastrable con el timer sobre otras apps (permiso "Mostrar sobre otras apps").

Los cambios de interfaz llegan solos (vía GitHub Pages). Solo hace falta un APK nuevo cuando
cambia el código nativo.

### Publicar una versión

```bash
git tag apk-v1.0.1 && git push origin apk-v1.0.1
```

El workflow `.github/workflows/android.yml` compila, firma y publica `TrainingHelper-1.0.1.apk`
en Releases. Necesita los secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`.

### Compilar localmente

Requiere JDK 21 y el SDK de Android (plataforma 36).

```bash
pnpm build && pnpm exec cap sync android
cd android && ./gradlew assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
```

La clave de firma **no** está en el repo. Guardala bien: sin ella no se pueden publicar
actualizaciones que se instalen encima de la versión anterior.
