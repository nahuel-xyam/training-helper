"use client";

import Link from "next/link";
import { MdEdit, MdNotificationsActive, MdNotificationsOff, MdStayCurrentPortrait, MdVibration, MdVolumeOff, MdVolumeUp } from "react-icons/md";
import type { IconType } from "react-icons";
import { DayNightToggle } from "./DayNightToggle";

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
      className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 active:scale-90 disabled:opacity-25 ${
        on
          ? // claro: naranja claro con ícono blanco · oscuro: verde translúcido con glow
            "border-orange-500/20 bg-orange-400 text-white shadow-[0_6px_16px_-6px_rgba(249,115,22,0.7)] " +
            "dark:border-green-400/40 dark:bg-green-400/10 dark:text-green-300 dark:shadow-[0_0_18px_-4px_rgba(74,222,128,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]"
          : "border-fg/10 bg-fg/[0.04] text-fg/35"
      }`}
    >
      <Icon size={22} />
      {!on && !IconOff && <span className="absolute h-0.5 w-7 rotate-45 rounded bg-fg/40" />}
    </button>
  );
}

type Props = {
  notificationsOn: boolean;
  soundOn: boolean;
  /** sonido silenciado automáticamente (ventana flotante abierta) */
  soundLocked?: boolean;
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

const squareBtn =
  "flex h-11 w-11 items-center justify-center rounded-2xl border border-fg/15 bg-fg/[0.06] text-fg/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform active:scale-90";

export function TopBar(p: Props) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
      <div className="flex gap-1.5">
        <Toggle on={p.notificationsOn} onClick={p.onToggleNotifications} label="Notificaciones" IconOn={MdNotificationsActive} IconOff={MdNotificationsOff} />
        <Toggle
          on={p.soundOn}
          onClick={p.onToggleSound}
          label={p.soundLocked ? "Sonido (silenciado por la ventana flotante)" : "Sonido"}
          IconOn={MdVolumeUp}
          IconOff={MdVolumeOff}
          disabled={p.soundLocked}
        />
        <Toggle on={p.vibrationOn && p.canVibrate} onClick={p.onToggleVibration} label="Vibración" IconOn={MdVibration} disabled={!p.canVibrate} />
        <Toggle on={p.wakeLockOn && p.canWakeLock} onClick={p.onToggleWakeLock} label="Pantalla siempre encendida" IconOn={MdStayCurrentPortrait} disabled={!p.canWakeLock} />
      </div>
      <div className="flex items-center gap-1.5">
        <DayNightToggle />
        {p.editorDisabled ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fg/5 text-fg/15" title="Pará el entrenamiento para editar">
            <MdEdit size={22} />
          </span>
        ) : (
          <Link href="/editor/" aria-label="Editar entrenamiento" className={squareBtn}>
            <MdEdit size={22} />
          </Link>
        )}
      </div>
    </header>
  );
}
