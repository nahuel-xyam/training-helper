"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { formatSpeed, KIND_STYLES, stageIndexAt, type TimelineStage } from "@/lib/workout";

/**
 * Ventana flotante (Picture-in-Picture) con la cuenta regresiva de la etapa.
 *
 * La web no puede dibujar sobre otras apps, pero sí puede mandar un <video> a PiP.
 * Dibujamos el timer en un <canvas>, lo convertimos en video con captureStream()
 * y ese video es el que flota sobre YouTube, etc.
 */

export type PipSnapshot = {
  timeline: TimelineStage[];
  cycles: number;
  /** segundos de entrenamiento transcurridos en el instante `at` */
  elapsed: number;
  total: number;
  running: boolean;
  paused: boolean;
  finished: boolean;
  /** factor de velocidad (modo prueba) */
  speed: number;
  /** Date.now() en que se tomó el snapshot */
  at: number;
};

// Proporción ~2:1. El diseño está en W x H y se dibuja escalado por SCALE
// (para achicar/agrandar toda la ventana flotante basta con cambiar SCALE).
const W = 480;
const H = 238;
const SCALE = 0.5625; // 0.75 × 0.75

type WebkitVideo = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  webkitPresentationMode?: string;
};

function detectSupport(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  if (typeof canvas.captureStream !== "function") return false;
  const video = document.createElement("video") as WebkitVideo;
  return document.pictureInPictureEnabled === true || typeof video.webkitSetPresentationMode === "function";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, snap: PipSnapshot, fonts: { sans: string; mono: string }) {
  // Calculamos la etapa acá (no desde React), así sigue bien aunque la página esté frenada en segundo plano.
  const now = Date.now();
  const elapsed = snap.elapsed + (snap.running ? ((now - snap.at) / 1000) * snap.speed : 0);
  const idx = stageIndexAt(snap.timeline, elapsed);
  const t = idx < snap.timeline.length ? snap.timeline[idx] : null;
  const finished = snap.finished || !t;
  const style = t ? KIND_STYLES[t.stage.kind] : null;
  const s = {
    color: style?.color ?? "#22c55e",
    chip: finished ? "¡Terminado!" : t!.cycle ? `Ciclo ${t!.cycle}/${snap.cycles}` : style!.label,
    title: finished ? "Bien ahí 🎉" : t!.stage.name,
    speedText: finished ? "" : formatSpeed(t!.stage),
    paused: snap.paused,
    finished,
  };
  const remaining = t ? Math.max(0, t.endSec - elapsed) : 0;
  const progress = t ? Math.min(1, (elapsed - t.startSec) / t.stage.durationSec) : 1;

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  // Fondo: color de la etapa oscurecido
  ctx.fillStyle = "#0b0b0f";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = s.color;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";

  // Fila superior: chip y velocidad
  ctx.font = `700 18px ${fonts.sans}`;
  ctx.textAlign = "left";
  ctx.fillText(s.chip.toUpperCase(), 28, 40);
  if (s.speedText) {
    ctx.textAlign = "right";
    ctx.fillText(s.speedText, W - 28, 40);
  }

  // Cuenta regresiva
  const secs = Math.ceil(remaining);
  const text = s.finished ? "00:00" : `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
  ctx.textAlign = "center";
  ctx.font = `800 88px ${fonts.mono}`;
  ctx.fillText(text, W / 2, 138);

  // Nombre de la etapa (o pausa)
  ctx.font = `700 23px ${fonts.sans}`;
  ctx.fillText(s.paused ? `⏸ En pausa · ${s.title}` : s.title, W / 2, 176);

  // Barra de avance
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  roundRect(ctx, 28, 200, W - 56, 8, 4);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 28, 200, Math.max(8, (W - 56) * progress), 8, 4);
}

export function usePictureInPicture(snapshotRef: RefObject<PipSnapshot | null>) {
  const [supported] = useState(detectSupport);
  const [active, setActive] = useState(false);
  const els = useRef<{ canvas: HTMLCanvasElement; video: WebkitVideo; ctx: CanvasRenderingContext2D } | null>(null);
  const loop = useRef<number | undefined>(undefined);

  const render = useCallback(() => {
    const e = els.current;
    const s = snapshotRef.current;
    if (!e || !s) return;
    const css = getComputedStyle(document.documentElement);
    const fonts = {
      sans: css.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif",
      mono: css.getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace",
    };
    draw(e.ctx, s, fonts);
  }, [snapshotRef]);

  const stopLoop = useCallback(() => {
    window.clearInterval(loop.current);
    loop.current = undefined;
    els.current?.video.pause();
    setActive(false);
  }, []);

  const ensureElements = useCallback(() => {
    if (els.current) return els.current;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * SCALE);
    canvas.height = Math.round(H * SCALE);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const video = document.createElement("video") as WebkitVideo;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.srcObject = canvas.captureStream(4);
    // El video tiene que estar en el documento, pero no se ve.
    Object.assign(video.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "2px",
      height: "2px",
      opacity: "0.01",
      pointerEvents: "none",
    });
    document.body.appendChild(video);
    video.addEventListener("leavepictureinpicture", stopLoop);
    video.addEventListener("webkitpresentationmodechanged", () => {
      if (video.webkitPresentationMode !== "picture-in-picture") stopLoop();
    });
    els.current = { canvas, video, ctx };
    return els.current;
  }, [stopLoop]);

  /** Abre la ventana flotante. Tiene que llamarse desde un toque del usuario. */
  const open = useCallback(async (): Promise<boolean> => {
    const e = ensureElements();
    if (!e) return false;
    render();
    window.clearInterval(loop.current);
    loop.current = window.setInterval(render, 250);
    try {
      await e.video.play();
      if (typeof e.video.requestPictureInPicture === "function" && document.pictureInPictureEnabled) {
        await e.video.requestPictureInPicture();
      } else if (e.video.webkitSetPresentationMode) {
        e.video.webkitSetPresentationMode("picture-in-picture");
      } else {
        throw new Error("PiP no soportado");
      }
      setActive(true);
      return true;
    } catch {
      stopLoop();
      return false;
    }
  }, [ensureElements, render, stopLoop]);

  const close = useCallback(async () => {
    const e = els.current;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (e?.video.webkitPresentationMode === "picture-in-picture") e.video.webkitSetPresentationMode?.("inline");
    } catch {
      /* ignorar */
    }
    stopLoop();
  }, [stopLoop]);

  // Limpieza al desmontar
  useEffect(
    () => () => {
      window.clearInterval(loop.current);
      els.current?.video.remove();
    },
    []
  );

  return { supported, active, open, close };
}
