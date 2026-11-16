import { formatTime } from "@/lib/workout";

export function BigClock({ elapsed, total }: { elapsed: number; total: number }) {
  const pct = total ? Math.min(100, (elapsed / total) * 100) : 0;
  return (
    <div className="flex w-full flex-col items-center px-4">
      <div className="font-mono text-[clamp(4.5rem,24vw,10rem)] font-bold leading-none tabular-nums tracking-tight">
        {formatTime(elapsed)}
      </div>
      <div className="mt-1 text-sm text-white/50 tabular-nums">
        de {formatTime(total)} · restan {formatTime(Math.ceil(total - elapsed))}
      </div>
      <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white/70 transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
