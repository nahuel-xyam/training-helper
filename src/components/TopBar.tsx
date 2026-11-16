"use client";

import Link from "next/link";
import { MdEdit, MdLightMode, MdNotificationsActive, MdNotificationsOff, MdVibration, MdVolumeOff, MdVolumeUp } from "react-icons/md";
import type { IconType } from "react-icons";

type ToggleProps = {
  on: boolean;
  onClick: () => void;
  label: string;
  IconOn: IconType;
  IconOff?: IconType;
  disabled?: boolean;
};

function Toggle({ on, onClick, label, IconOn, IconOff, disabled }: ToggleProps) {
  const Icon = on || !IconOff ? IconOn : IconOff;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={`${label}: ${on ? "activado" : "desactivado"}`}
      title={`${label}: ${on ? "activado" : "desactivado"}`}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-30 ${
        on ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-transparent text-white/40"
      }`}
    >
      <Icon size={22} />
      {!on && !IconOff && <span className="absolute h-0.5 w-7 rotate-45 rounded bg-white/50" />}
    </button>
  );
}

type Props = {
  notificationsOn: boolean;
  soundOn: boolean;
  vibrationOn: boolean;
  wakeLockOn: boolean;
  canVibrate: boolean;
  canWakeLock: boolean;
  editorDisabled: boolean;
  onToggleNotifications: () => void;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  onToggleWakeLock: () => void;
};

export function TopBar(p: Props) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
      <div className="flex gap-2">
        <Toggle on={p.notificationsOn} onClick={p.onToggleNotifications} label="Notificaciones" IconOn={MdNotificationsActive} IconOff={MdNotificationsOff} />
        <Toggle on={p.soundOn} onClick={p.onToggleSound} label="Sonido" IconOn={MdVolumeUp} IconOff={MdVolumeOff} />
        <Toggle on={p.vibrationOn && p.canVibrate} onClick={p.onToggleVibration} label="Vibración" IconOn={MdVibration} disabled={!p.canVibrate} />
        <Toggle on={p.wakeLockOn && p.canWakeLock} onClick={p.onToggleWakeLock} label="Pantalla siempre encendida" IconOn={MdLightMode} disabled={!p.canWakeLock} />
      </div>
      {p.editorDisabled ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full text-white/20" title="Pará el entrenamiento para editar">
          <MdEdit size={22} />
        </span>
      ) : (
        <Link href="/editor/" aria-label="Editar entrenamiento" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/80">
          <MdEdit size={22} />
        </Link>
      )}
    </header>
  );
}
