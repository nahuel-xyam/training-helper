function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Formato MM:SS:CC (centésimas). Si pasa la hora, H:MM:SS:CC. */
export function BigClock({ elapsed, total }: { elapsed: number; total: number }) {
  const pct = total ? Math.min(100, (elapsed / total) * 100) : 0;
  const cs = Math.floor(elapsed * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  const remaining = Math.max(0, Math.ceil(total - elapsed));
  const remText = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;
  const totText = `${pad(Math.floor(total / 60))}:${pad(Math.floor(total % 60))}`;

  return (
    <div className="flex w-full flex-col items-center px-4">
      <div className="flex items-baseline font-mono font-bold leading-none tabular-nums tracking-tight">
        <span className="text-[clamp(3.5rem,19vw,8.5rem)]">
          {h > 0 && `${h}:`}
          {pad(m)}:{pad(s)}
        </span>
        <span className="text-[clamp(2rem,10vw,4.5rem)] text-fg/55">:{pad(c)}</span>
      </div>
      <div className="mt-2 text-sm text-fg/50 tabular-nums">
        de {totText} · restan {remText}
      </div>
      <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-fg/10">
        <div className="h-full rounded-full bg-linear-to-r from-fg/60 to-fg" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
