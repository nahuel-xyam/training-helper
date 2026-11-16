import type { ReactNode } from "react";
import { FaPause, FaPlay, FaRedo, FaStop } from "react-icons/fa";
import type { TimerStatus } from "@/hooks/useWorkoutTimer";

type Props = {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

/** Botón principal: pill verde sólida con el ícono en un círculo blanco. */
function StartButton({ onClick, again }: { onClick: () => void; again: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group flex h-20 w-72 max-w-[85vw] items-center gap-4 rounded-full py-3 pr-8 pl-3 select-none " +
        "bg-linear-to-b from-green-400 to-green-600 text-white " +
        "shadow-[0_18px_40px_-14px_rgba(22,163,74,0.75),inset_0_1px_0_rgba(255,255,255,0.35)] " +
        "transition-[transform,box-shadow,filter] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.97]"
      }
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-green-600 shadow-md transition-transform duration-200 group-active:scale-90">
        {again ? <FaRedo size={20} /> : <FaPlay size={20} className="ml-1" />}
      </span>
      <span className="flex-1 text-center text-2xl font-bold tracking-tight">{again ? "Otra vez" : "Empezar"}</span>
    </button>
  );
}

// Pausa / Seguir / Parar: translúcidos teñidos (estilo app de fitness), mismo tamaño y forma.
const tinted =
  "flex h-20 w-40 items-center justify-center gap-3 rounded-[1.75rem] select-none text-lg font-semibold " +
  "border shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-[transform,border-color,--tw-gradient-from,--tw-gradient-to] duration-200 ease-out active:scale-[0.95]";

// Degradé vertical suave (más intenso arriba), igual que la pill de Empezar pero translúcido.
const tones = {
  pause:
    "bg-linear-to-b border-amber-500/25 from-amber-400/35 to-amber-400/10 text-amber-700 hover:from-amber-400/45 hover:to-amber-400/20 " +
    "dark:border-amber-300/20 dark:from-amber-400/30 dark:to-amber-400/5 dark:text-amber-300 dark:hover:from-amber-400/40 dark:hover:to-amber-400/10",
  go:
    "bg-linear-to-b border-green-500/25 from-green-500/30 to-green-500/5 text-green-700 hover:from-green-500/40 hover:to-green-500/15 " +
    "dark:border-green-300/20 dark:from-green-400/30 dark:to-green-400/5 dark:text-green-300 dark:hover:from-green-400/40 dark:hover:to-green-400/10",
  stop:
    "bg-linear-to-b border-rose-500/25 from-rose-500/30 to-rose-500/5 text-rose-600 hover:from-rose-500/40 hover:to-rose-500/15 " +
    "dark:border-rose-300/20 dark:from-rose-500/30 dark:to-rose-500/5 dark:text-rose-300 dark:hover:from-rose-500/40 dark:hover:to-rose-500/10",
};

function TintedButton({ onClick, tone, icon, label }: { onClick: () => void; tone: keyof typeof tones; icon: ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`${tinted} ${tones[tone]}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function Controls({ status, onStart, onPause, onResume, onStop }: Props) {
  if (status === "idle" || status === "finished") {
    return <StartButton onClick={onStart} again={status === "finished"} />;
  }

  return (
    <div className="flex items-center gap-3">
      {status === "running" ? (
        <TintedButton onClick={onPause} tone="pause" icon={<FaPause size={20} />} label="Pausa" />
      ) : (
        <TintedButton onClick={onResume} tone="go" icon={<FaPlay size={18} />} label="Seguir" />
      )}
      <TintedButton onClick={onStop} tone="stop" icon={<FaStop size={18} />} label="Parar" />
    </div>
  );
}
