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
