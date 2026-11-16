"use client";

import { useState } from "react";
import { MdClose, MdInstallMobile, MdIosShare } from "react-icons/md";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { dismissInstall, isInstallDismissed } from "@/lib/storage";

export function InstallBanner() {
  const { canPrompt, showIOSHint, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(isInstallDismissed);

  if (dismissed || (!canPrompt && !showIOSHint)) return null;

  const close = () => {
    dismissInstall();
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-20 flex items-center gap-3 rounded-2xl border border-white/15 bg-zinc-800/95 p-3 shadow-xl backdrop-blur">
      <MdInstallMobile size={28} className="shrink-0 text-green-400" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Instalá la app</p>
        {canPrompt ? (
          <p className="text-white/60">Usala como app y recibí avisos aunque estés en otra cosa.</p>
        ) : (
          <p className="text-white/60">
            Tocá <MdIosShare className="inline align-text-bottom" /> Compartir → <b>Agregar a inicio</b>. En iPhone las notificaciones solo funcionan instalada.
          </p>
        )}
      </div>
      {canPrompt && (
        <button type="button" onClick={() => void install().then(close)} className="rounded-xl bg-green-500 px-3 py-2 text-sm font-bold text-black">
          Instalar
        </button>
      )}
      <button type="button" onClick={close} aria-label="Cerrar" className="p-1 text-white/50">
        <MdClose size={20} />
      </button>
    </div>
  );
}
